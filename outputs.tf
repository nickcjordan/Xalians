# Output value definitions

output "lambda_bucket_name" {
  description = "Name of the S3 bucket used to store function code."

  value = aws_s3_bucket.lambda_bucket.id
}


# output for lambda function name

output "function_name" {
  description = "Name of the Lambda function."

  value = aws_lambda_function.lambda_function_generate_xalian.function_name
}



# api gateway url output

output "base_url" {
  description = "Base URL for API Gateway stage."

  value = aws_apigatewayv2_stage.lambda.invoke_url
}
