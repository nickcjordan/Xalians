# Input variable definitions

variable "aws_region" {
  description = "AWS region for all resources."

  type    = string
  default = "us-east-1"
}

variable "cert_arn" {
  description = "arn of a cert I made"
  type = string
  default = "arn:aws:acm:us-east-1:174497891311:certificate/d4cfcbd4-b938-472d-97b6-22f7faf29d4c"
}

variable "hosted_zone_id" {
  description = "zone id of xalians route53 hosted zone"
  type = string
  default = "Z0533382310UWJ6FIDZF9"
}