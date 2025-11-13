output "domain_name" {
  description = "Custom domain name"
  value       = aws_apigatewayv2_domain_name.main.domain_name
}

output "target_domain_name" {
  description = "API Gateway target domain name"
  value       = aws_apigatewayv2_domain_name.main.domain_name_configuration[0].target_domain_name
}

output "dns_record" {
  description = "DNS record FQDN"
  value       = aws_route53_record.api.fqdn
}
