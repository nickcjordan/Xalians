terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.48.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2.0"
    }
  }

  required_version = "~> 1.0"
}

provider "aws" {
  region = var.aws_region
}

resource "random_pet" "lambda_bucket_name" {
  prefix = "chronic-labs"
  length = 4
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = random_pet.lambda_bucket_name.id
  acl           = "private"
  force_destroy = true
}



# copy to s3 bucket

data "archive_file" "lambda_generate_xalian" {
  type = "zip"

  source_dir  = "${path.module}/src"
  output_path = "${path.module}/generate_xalian_lambda.zip"
}

resource "aws_s3_bucket_object" "lambda_generate_xalian_object" {
  bucket = aws_s3_bucket.lambda_bucket.id

  key    = "generate_xalian_lambda.zip"
  source = data.archive_file.lambda_generate_xalian.output_path

  etag = filemd5(data.archive_file.lambda_generate_xalian.output_path)
}




# lambda function and resources

resource "aws_lambda_function" "lambda_function_generate_xalian" {
  function_name = "GenerateXalian"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.lambda_generate_xalian_object.key

  runtime = "nodejs12.x"
  handler = "generateXalianLambda.handler"

  source_code_hash = data.archive_file.lambda_generate_xalian.output_base64sha256

  role = aws_iam_role.lambda_exec.arn
}

resource "aws_cloudwatch_log_group" "lambda_function_generate_xalian" {
  name = "/aws/lambda/${aws_lambda_function.lambda_function_generate_xalian.function_name}"

  retention_in_days = 30
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}



# API gateway

resource "aws_apigatewayv2_api" "lambda" {
  name          = "XalianAPI"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "xalian-test"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      }
    )
  }
}

resource "aws_apigatewayv2_integration" "lambda_function_generate_xalian" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.lambda_function_generate_xalian.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "lambda_function_generate_xalian" {
  api_id = aws_apigatewayv2_api.lambda.id

  route_key = "GET /xalian"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_function_generate_xalian.id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

  retention_in_days = 30
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_function_generate_xalian.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}




