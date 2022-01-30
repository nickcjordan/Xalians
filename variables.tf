# Input variable definitions

variable "aws_region" {
  description = "AWS region for all resources."

  type    = string
  default = "us-east-1"
}

variable "cert_arn" {
  description = "arn of a cert I made"
  type = string
  // default = "arn:aws:acm:us-east-1:174497891311:certificate/d4cfcbd4-b938-472d-97b6-22f7faf29d4c"
  default = "arn:aws:acm:us-east-1:174497891311:certificate/e245e9ca-4f24-48b9-bf6b-14d2dcd6e417"
}

variable "hosted_zone_id" {
  description = "zone id of xalians route53 hosted zone"
  type = string
  default = "Z0533382310UWJ6FIDZF9"
}

variable "frontend_bucket_name" {
  default = "xalians.com"
}

variable "cloudfront_arn" {
  description = "arn"
  type = string
  default = "arn:aws:cloudfront::174497891311:distribution/E25EPFZCU2J0HP"
}

variable "cloudfront_id" {
  description = "cloudfront"
  type = string
  default = "E25EPFZCU2J0HP"
}
