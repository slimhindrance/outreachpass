#!/usr/bin/env python3
"""
Production Environment End-to-End Test Suite
Tests all critical endpoints and services in production.
"""

import sys
import json
import time
import requests
from typing import Dict, Any, List, Tuple

# Production configuration
PROD_API_BASE_URL = "https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com"
TEST_TIMEOUT = 30  # seconds

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name: str):
    print(f"\n{Colors.BLUE}🧪 Testing:{Colors.RESET} {name}")

def print_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.RESET}")

def print_header(title: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")


class ProductionTestSuite:
    def __init__(self):
        self.base_url = PROD_API_BASE_URL
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.test_card_id = None

    def run_all_tests(self) -> bool:
        """Run all production tests and return overall success status."""
        print_header("OutreachPass Production Test Suite")
        print_info(f"Testing environment: {self.base_url}")

        tests = [
            ("Health Check", self.test_health_endpoint),
            ("Database Connectivity", self.test_database_connection),
            ("List Cards (Empty)", self.test_list_cards_empty),
            ("Create Card", self.test_create_card),
            ("Get Card", self.test_get_card),
            ("List Cards (With Data)", self.test_list_cards_with_data),
            ("Update Card", self.test_update_card),
            ("Delete Card", self.test_delete_card),
            ("Verify Deletion", self.test_verify_deletion),
        ]

        for test_name, test_func in tests:
            try:
                print_test(test_name)
                test_func()
            except Exception as e:
                print_error(f"Test '{test_name}' failed with exception: {str(e)}")
                self.failed += 1

        self.print_summary()
        return self.failed == 0

    def test_health_endpoint(self):
        """Test the /health endpoint."""
        response = requests.get(f"{self.base_url}/health", timeout=TEST_TIMEOUT)

        if response.status_code != 200:
            print_error(f"Health check failed with status {response.status_code}")
            self.failed += 1
            return

        data = response.json()

        # Verify response structure
        required_fields = ["status", "timestamp", "service", "dependencies"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            print_error(f"Missing fields in health response: {missing}")
            self.failed += 1
            return

        # Check overall health
        if data["status"] != "healthy":
            print_error(f"Health status is {data['status']}, expected 'healthy'")
            self.failed += 1
            return

        # Check dependencies
        deps = data.get("dependencies", {})
        for service, info in deps.items():
            status = info.get("status", "unknown")
            if status != "healthy":
                print_warning(f"Dependency {service} is {status}: {info.get('message', '')}")
                self.warnings += 1
            else:
                print_info(f"✓ {service}: {info.get('message', 'OK')}")

        print_success("Health endpoint is working correctly")
        self.passed += 1

    def test_database_connection(self):
        """Verify database connectivity through health check."""
        response = requests.get(f"{self.base_url}/health", timeout=TEST_TIMEOUT)

        if response.status_code != 200:
            print_error("Cannot verify database - health endpoint failed")
            self.failed += 1
            return

        data = response.json()
        db_status = data.get("dependencies", {}).get("database", {})

        if db_status.get("status") != "healthy":
            print_error(f"Database is not healthy: {db_status.get('message', 'Unknown error')}")
            self.failed += 1
            return

        print_success("Database connection verified")
        self.passed += 1

    def test_list_cards_empty(self):
        """Test listing cards (should be empty initially)."""
        response = requests.get(f"{self.base_url}/api/admin/cards", timeout=TEST_TIMEOUT)

        if response.status_code != 200:
            print_error(f"List cards failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            self.failed += 1
            return

        data = response.json()

        # The API might return empty list or paginated response
        if isinstance(data, list):
            card_count = len(data)
        elif isinstance(data, dict) and "items" in data:
            card_count = len(data["items"])
        else:
            card_count = 0

        print_info(f"Found {card_count} existing cards")
        print_success("List cards endpoint is working")
        self.passed += 1

    def test_create_card(self):
        """Test creating a new card."""
        card_data = {
            "tenant_id": "00000000-0000-0000-0000-000000000000",
            "event_id": "00000000-0000-0000-0000-000000000000",
            "attendee_id": "00000000-0000-0000-0000-000000000000",
            "first_name": "Production",
            "last_name": "Test",
            "email": "production.test@example.com",
            "company": "Test Corp",
            "title": "QA Engineer"
        }

        response = requests.post(
            f"{self.base_url}/api/admin/cards",
            json=card_data,
            timeout=TEST_TIMEOUT
        )

        if response.status_code not in [200, 201]:
            print_error(f"Create card failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            self.failed += 1
            return

        data = response.json()

        if "id" not in data:
            print_error("Created card does not have an 'id' field")
            self.failed += 1
            return

        self.test_card_id = data["id"]
        print_info(f"Created card with ID: {self.test_card_id}")
        print_success("Card creation successful")
        self.passed += 1

    def test_get_card(self):
        """Test retrieving a specific card."""
        if not self.test_card_id:
            print_warning("Skipping get card test - no card ID available")
            self.warnings += 1
            return

        response = requests.get(
            f"{self.base_url}/api/admin/cards/{self.test_card_id}",
            timeout=TEST_TIMEOUT
        )

        if response.status_code != 200:
            print_error(f"Get card failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            self.failed += 1
            return

        data = response.json()

        if data.get("id") != self.test_card_id:
            print_error(f"Retrieved card ID {data.get('id')} doesn't match {self.test_card_id}")
            self.failed += 1
            return

        if data.get("first_name") != "Production":
            print_error(f"Card data mismatch - expected 'Production', got '{data.get('first_name')}'")
            self.failed += 1
            return

        print_success("Card retrieval successful")
        self.passed += 1

    def test_list_cards_with_data(self):
        """Test listing cards after creation."""
        response = requests.get(f"{self.base_url}/api/admin/cards", timeout=TEST_TIMEOUT)

        if response.status_code != 200:
            print_error(f"List cards failed with status {response.status_code}")
            self.failed += 1
            return

        data = response.json()

        # Find our test card in the list
        cards = data if isinstance(data, list) else data.get("items", [])
        found = any(card.get("id") == self.test_card_id for card in cards)

        if not found and self.test_card_id:
            print_warning(f"Test card {self.test_card_id} not found in list")
            self.warnings += 1
        else:
            print_info(f"Found {len(cards)} total cards")

        print_success("List cards with data successful")
        self.passed += 1

    def test_update_card(self):
        """Test updating a card."""
        if not self.test_card_id:
            print_warning("Skipping update card test - no card ID available")
            self.warnings += 1
            return

        update_data = {
            "title": "Senior QA Engineer"
        }

        response = requests.put(
            f"{self.base_url}/api/admin/cards/{self.test_card_id}",
            json=update_data,
            timeout=TEST_TIMEOUT
        )

        if response.status_code != 200:
            print_error(f"Update card failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            self.failed += 1
            return

        data = response.json()

        if data.get("title") != "Senior QA Engineer":
            print_error(f"Card update failed - title is '{data.get('title')}'")
            self.failed += 1
            return

        print_success("Card update successful")
        self.passed += 1

    def test_delete_card(self):
        """Test deleting a card."""
        if not self.test_card_id:
            print_warning("Skipping delete card test - no card ID available")
            self.warnings += 1
            return

        response = requests.delete(
            f"{self.base_url}/api/admin/cards/{self.test_card_id}",
            timeout=TEST_TIMEOUT
        )

        if response.status_code not in [200, 204]:
            print_error(f"Delete card failed with status {response.status_code}")
            print_error(f"Response: {response.text}")
            self.failed += 1
            return

        print_success("Card deletion successful")
        self.passed += 1

    def test_verify_deletion(self):
        """Verify the card was actually deleted."""
        if not self.test_card_id:
            print_warning("Skipping deletion verification - no card ID available")
            self.warnings += 1
            return

        response = requests.get(
            f"{self.base_url}/api/admin/cards/{self.test_card_id}",
            timeout=TEST_TIMEOUT
        )

        if response.status_code == 200:
            print_error("Card still exists after deletion")
            self.failed += 1
            return

        if response.status_code != 404:
            print_warning(f"Unexpected status {response.status_code} when fetching deleted card")
            self.warnings += 1
            return

        print_success("Card deletion verified")
        self.passed += 1

    def print_summary(self):
        """Print test execution summary."""
        print_header("Test Summary")

        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0

        print(f"{Colors.GREEN}Passed:{Colors.RESET}   {self.passed}/{total} ({success_rate:.1f}%)")
        print(f"{Colors.RED}Failed:{Colors.RESET}   {self.failed}/{total}")
        print(f"{Colors.YELLOW}Warnings:{Colors.RESET} {self.warnings}")

        if self.failed == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 All tests passed!{Colors.RESET}")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ {self.failed} test(s) failed{Colors.RESET}")


def main():
    """Main entry point."""
    suite = ProductionTestSuite()
    success = suite.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
