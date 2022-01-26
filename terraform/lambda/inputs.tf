variable "function_name" {
  type    = string
}

variable "route_key" {
    type = string
    default = "GET /xalian"
}

variable "handler_name" {
    type = string
    default = "generateXalianLambda.handler"
}

variable "lambda_code_s3_bucket_id" {
    type = string
}

variable "lambda_code_s3_bucket_key" {
    type = string
}

variable "source_code_hash" {
    type = string
}

variable "role" {
    type = string
}