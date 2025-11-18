#!/bin/bash

###############################################################################
# AWS Infrastructure Nuke Script
#
# ⚠️  DESTRUCTIVE OPERATION - USE WITH EXTREME CAUTION ⚠️
#
# This script will DELETE ALL CI/CD infrastructure for OutreachPass:
# - S3 bucket: outreachpass-terraform-state (including all versions)
# - S3 bucket: outreachpass-artifacts (including all versions)
# - DynamoDB table: terraform-state-locks
#
# WARNING: This action is IRREVERSIBLE. All Terraform state and build
# artifacts will be permanently deleted.
#
# Usage:
#   ./scripts/nuke-aws-infrastructure.sh [--yes]
#
# Options:
#   --yes    Skip confirmation prompt (use for automation)
#
# Created: 2025-11-17
# Related: docs/AWS_INFRASTRUCTURE_INVENTORY.md
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Resource names
TERRAFORM_STATE_BUCKET="outreachpass-terraform-state"
ARTIFACTS_BUCKET="outreachpass-artifacts"
DYNAMODB_TABLE="terraform-state-locks"
REGION="us-east-1"

# Logging
LOG_FILE="/tmp/aws-nuke-$(date +%Y%m%d-%H%M%S).log"

###############################################################################
# Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install it first."
        exit 1
    fi
}

check_credentials() {
    log "Verifying AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid."
        error "Run 'aws configure' to set up credentials."
        exit 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")

    success "Authenticated as AWS Account: $ACCOUNT_ID"
    log "Using region: $AWS_REGION"
}

bucket_exists() {
    local bucket=$1
    aws s3api head-bucket --bucket "$bucket" 2>/dev/null
    return $?
}

table_exists() {
    local table=$1
    aws dynamodb describe-table --table-name "$table" --region "$REGION" &>/dev/null
    return $?
}

count_bucket_objects() {
    local bucket=$1
    local count=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | grep "Total Objects:" | awk '{print $3}')
    echo "${count:-0}"
}

get_bucket_size() {
    local bucket=$1
    local size=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | grep "Total Size:" | awk '{print $3}')
    echo "${size:-0}"
}

delete_s3_bucket() {
    local bucket=$1

    if ! bucket_exists "$bucket"; then
        warning "Bucket $bucket does not exist, skipping..."
        return 0
    fi

    log "Processing S3 bucket: $bucket"

    # Get stats before deletion
    local obj_count=$(count_bucket_objects "$bucket")
    local bucket_size=$(get_bucket_size "$bucket")
    log "  Objects: $obj_count"
    log "  Size: $bucket_size bytes"

    # Delete all object versions (for versioned buckets)
    log "  Deleting all object versions..."
    aws s3api list-object-versions \
        --bucket "$bucket" \
        --output json \
        --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
        2>/dev/null | \
    aws s3api delete-objects \
        --bucket "$bucket" \
        --delete file:///dev/stdin \
        >/dev/null 2>&1 || true

    # Delete all delete markers
    log "  Deleting all delete markers..."
    aws s3api list-object-versions \
        --bucket "$bucket" \
        --output json \
        --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
        2>/dev/null | \
    aws s3api delete-objects \
        --bucket "$bucket" \
        --delete file:///dev/stdin \
        >/dev/null 2>&1 || true

    # Delete any remaining objects (non-versioned)
    log "  Removing any remaining objects..."
    aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true

    # Delete the bucket
    log "  Deleting bucket..."
    if aws s3 rb "s3://$bucket" --force 2>/dev/null; then
        success "Deleted S3 bucket: $bucket"
    else
        error "Failed to delete bucket: $bucket"
        return 1
    fi
}

delete_dynamodb_table() {
    local table=$1

    if ! table_exists "$table"; then
        warning "DynamoDB table $table does not exist, skipping..."
        return 0
    fi

    log "Processing DynamoDB table: $table"

    # Get table info
    local item_count=$(aws dynamodb describe-table \
        --table-name "$table" \
        --region "$REGION" \
        --query 'Table.ItemCount' \
        --output text 2>/dev/null || echo "0")
    log "  Items: $item_count"

    # Check for stuck locks
    if [ "$item_count" -gt 0 ]; then
        warning "  Table contains $item_count items (possible stuck locks)"
    fi

    # Delete the table
    log "  Deleting table..."
    if aws dynamodb delete-table \
        --table-name "$table" \
        --region "$REGION" \
        >/dev/null 2>&1; then

        # Wait for deletion to complete
        log "  Waiting for table deletion..."
        aws dynamodb wait table-not-exists \
            --table-name "$table" \
            --region "$REGION" \
            2>/dev/null || true

        success "Deleted DynamoDB table: $table"
    else
        error "Failed to delete table: $table"
        return 1
    fi
}

show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    RESOURCES TO BE DELETED                     "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # S3 Buckets
    echo "📦 S3 Buckets:"
    echo ""

    if bucket_exists "$TERRAFORM_STATE_BUCKET"; then
        local count=$(count_bucket_objects "$TERRAFORM_STATE_BUCKET")
        local size=$(get_bucket_size "$TERRAFORM_STATE_BUCKET")
        echo "  • $TERRAFORM_STATE_BUCKET"
        echo "    └─ Objects: $count"
        echo "    └─ Size: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "${size}B")"
        echo ""
    else
        echo "  • $TERRAFORM_STATE_BUCKET (does not exist)"
        echo ""
    fi

    if bucket_exists "$ARTIFACTS_BUCKET"; then
        local count=$(count_bucket_objects "$ARTIFACTS_BUCKET")
        local size=$(get_bucket_size "$ARTIFACTS_BUCKET")
        echo "  • $ARTIFACTS_BUCKET"
        echo "    └─ Objects: $count"
        echo "    └─ Size: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "${size}B")"
        echo ""
    else
        echo "  • $ARTIFACTS_BUCKET (does not exist)"
        echo ""
    fi

    # DynamoDB Table
    echo "🗄️  DynamoDB Tables:"
    echo ""

    if table_exists "$DYNAMODB_TABLE"; then
        local items=$(aws dynamodb describe-table \
            --table-name "$DYNAMODB_TABLE" \
            --region "$REGION" \
            --query 'Table.ItemCount' \
            --output text 2>/dev/null || echo "0")
        echo "  • $DYNAMODB_TABLE"
        echo "    └─ Items: $items"
        if [ "$items" -gt 0 ]; then
            echo "    └─ ⚠️  Contains lock items - may indicate active Terraform operations"
        fi
        echo ""
    else
        echo "  • $DYNAMODB_TABLE (does not exist)"
        echo ""
    fi

    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

confirm_deletion() {
    echo ""
    echo -e "${RED}⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️${NC}"
    echo ""
    echo "This action will PERMANENTLY DELETE:"
    echo "  • All Terraform state files (no recovery possible)"
    echo "  • All build artifacts and Lambda packages"
    echo "  • State locking table"
    echo ""
    echo "This operation is IRREVERSIBLE."
    echo ""
    echo -e "${YELLOW}Type 'DELETE EVERYTHING' to confirm:${NC} "
    read -r confirmation

    if [ "$confirmation" != "DELETE EVERYTHING" ]; then
        log "Operation cancelled by user."
        exit 0
    fi

    echo ""
    echo -e "${RED}Final confirmation. Type 'YES' to proceed:${NC} "
    read -r final_confirm

    if [ "$final_confirm" != "YES" ]; then
        log "Operation cancelled by user."
        exit 0
    fi
}

###############################################################################
# Main
###############################################################################

main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "          AWS Infrastructure Nuke Script"
    echo "          OutreachPass CI/CD Infrastructure"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    log "Starting infrastructure deletion process..."
    log "Log file: $LOG_FILE"
    echo ""

    # Pre-flight checks
    check_aws_cli
    check_credentials
    echo ""

    # Show what will be deleted
    show_summary

    # Confirm unless --yes flag provided
    if [ "${1:-}" != "--yes" ]; then
        confirm_deletion
    else
        warning "Running in automated mode (--yes flag detected)"
        log "Skipping confirmation prompts..."
    fi

    echo ""
    log "Beginning deletion process..."
    echo ""

    # Track failures
    FAILED=0

    # Delete S3 buckets
    log "Step 1/3: Deleting S3 buckets..."
    echo ""

    if ! delete_s3_bucket "$ARTIFACTS_BUCKET"; then
        FAILED=$((FAILED + 1))
    fi
    echo ""

    if ! delete_s3_bucket "$TERRAFORM_STATE_BUCKET"; then
        FAILED=$((FAILED + 1))
    fi
    echo ""

    # Delete DynamoDB table
    log "Step 2/3: Deleting DynamoDB table..."
    echo ""

    if ! delete_dynamodb_table "$DYNAMODB_TABLE"; then
        FAILED=$((FAILED + 1))
    fi
    echo ""

    # Final verification
    log "Step 3/3: Verifying deletion..."
    echo ""

    REMAINING=0

    if bucket_exists "$TERRAFORM_STATE_BUCKET"; then
        error "Bucket still exists: $TERRAFORM_STATE_BUCKET"
        REMAINING=$((REMAINING + 1))
    fi

    if bucket_exists "$ARTIFACTS_BUCKET"; then
        error "Bucket still exists: $ARTIFACTS_BUCKET"
        REMAINING=$((REMAINING + 1))
    fi

    if table_exists "$DYNAMODB_TABLE"; then
        error "Table still exists: $DYNAMODB_TABLE"
        REMAINING=$((REMAINING + 1))
    fi

    # Summary
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                         SUMMARY                                "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    if [ $FAILED -eq 0 ] && [ $REMAINING -eq 0 ]; then
        success "All resources successfully deleted!"
        echo ""
        echo "✅ Deleted:"
        echo "  • S3 bucket: $TERRAFORM_STATE_BUCKET"
        echo "  • S3 bucket: $ARTIFACTS_BUCKET"
        echo "  • DynamoDB table: $DYNAMODB_TABLE"
        echo ""
        success "Infrastructure completely removed."
        echo ""
        log "Log saved to: $LOG_FILE"
        exit 0
    else
        error "Deletion completed with errors."
        echo ""
        echo "❌ Failed operations: $FAILED"
        echo "⚠️  Remaining resources: $REMAINING"
        echo ""
        error "Please review the log file for details: $LOG_FILE"
        echo ""
        echo "You may need to manually delete remaining resources:"
        echo ""
        echo "  # Delete S3 buckets"
        echo "  aws s3 rb s3://$TERRAFORM_STATE_BUCKET --force"
        echo "  aws s3 rb s3://$ARTIFACTS_BUCKET --force"
        echo ""
        echo "  # Delete DynamoDB table"
        echo "  aws dynamodb delete-table --table-name $DYNAMODB_TABLE --region $REGION"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
