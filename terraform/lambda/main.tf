# lambda function and resources

resource "aws_lambda_function" "function" {
  //   function_name = "GenerateXalian"
  function_name = var.function_name

//   s3_bucket = module.lambda_code_s3_bucket.lambda_bucket.id
    s3_bucket = var.lambda_code_s3_bucket_id
//   s3_key    = module.lambda_code_s3_bucket_object.lambda_generate_xalian_object.key
s3_key = var.lambda_code_s3_bucket_key

  runtime = "nodejs12.x"
//   handler = "generateXalianLambda.handler"
  handler = var.handler_name

//   source_code_hash = data.archive_file.lambda_generate_xalian.output_base64sha256
var.source_code_hash

//   role = aws_iam_role.lambda_exec.arn
role = var.role
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${aws_lambda_function.function.function_name}"
  retention_in_days = 30
}

resource "aws_apigatewayv2_integration" "function_integration" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.function.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "function_route" {
  api_id = aws_apigatewayv2_api.lambda.id

  //   route_key = "GET /xalian"
  route_key = var.route_key
  target    = "integrations/${aws_apigatewayv2_integration.function_integration.id}"
}


resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.function.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}
