#########################################################
#####               LAMBDA INPUT VARS               #####
#########################################################

variable "function_name" {
  description = "name of lambda function to be created"
  type        = string
}

variable "lambda_bucket_id" {
  description = "id of the lambda bucket holding the code"
  type        = string
}

variable "lambda_bucket_object_key" {
  description = "key of the object with the lambda function"
  type        = string
}

variable "lambda_handler_path" {
  description = "file path of lambda handler for function"
  type        = string
}

variable "lambda_archive_file_output_hash" {
  description = "output_base64sha256 of lambda file zip"
  type        = string
}

variable "iam_role_arn" {
  description = "arn of iam role for lambda to assume"
  type        = string
}




#########################################################
#####               LAMBDA INSTANCE                 #####
#########################################################

# lambda function
resource "aws_lambda_function" "lambda_function" {
  function_name    = var.function_name
  s3_bucket        = var.lambda_bucket_id
  s3_key           = var.lambda_bucket_object_key
  runtime          = "nodejs12.x"
  handler          = var.lambda_handler_path
  source_code_hash = var.lambda_archive_file_output_hash
  role             = var.iam_role_arn
}

# lambda function cloudwatch log group
resource "aws_cloudwatch_log_group" "lambda_function_cloudwatch_group" {
  name              = "/aws/lambda/${aws_lambda_function.lambda_function.function_name}"
  retention_in_days = 7
}




#########################################################
###             API GATEWAY INPUT VARS              #####
#########################################################

variable "apigw_lambda_id" {
  description = "id of base api gateway instance"
  type        = string
}

variable "apigw_lambda_route_key" {
  description = "route key of path for api gateway that maps to the lambda function"
  type        = string
}

variable "base_apigw_lambda_execution_arn" {
  description = "execution arn of base api gateway"
  type        = string
}

variable "authorization_type" {
  description = "type of auth on method"
  type        = string
}


#########################################################
#####    API GATEWAY LAMBDA INTEGRATION INSTANCE    #####
#########################################################

# integration from api gateway to lambda
resource "aws_apigatewayv2_integration" "lambda_apigw_integration" {
  api_id = var.apigw_lambda_id

  integration_uri    = aws_lambda_function.lambda_function.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

# route from api gateway to lambda
resource "aws_apigatewayv2_route" "lambda_function_route" {
  api_id             = var.apigw_lambda_id
  route_key          = var.apigw_lambda_route_key
  authorization_type = var.authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda_apigw_integration.id}"
}

# permission from api gateway to lambda
resource "aws_lambda_permission" "apigw_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_function.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.base_apigw_lambda_execution_arn}/*/*"
}



#########################################################
#####                  OUTPUT VARS                  #####
#########################################################

// output "lambda_function_name" {
//   description = "Name of the S3 bucket used to store function code."

//   value = aws_s3_bucket.lambda_bucket.id
// }