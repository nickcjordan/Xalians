#########################################################
#####            GitHub Actions OIDC                #####
#########################################################
# The identity CI itself authenticates with. This is bootstrap
# infrastructure: it was created out-of-band (Terraform cannot create the
# credentials it needs to run) and imported later so the branch name and
# permissions are version-controlled rather than console-edited.
#
# Renaming the default branch means editing github_actions_branch below.
# Miss it and every push-triggered `Deploy backend` fails at the
# "Configure AWS credentials" step with:
#   Not authorized to perform sts:AssumeRoleWithWebIdentity

data "aws_caller_identity" "current" {}

locals {
  github_repo            = "nickcjordan/Xalians"
  github_actions_branch  = "main"
  github_oidc_issuer     = "token.actions.githubusercontent.com"
  terraform_state_bucket = "xalians-terraform-state-174497891311"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://${local.github_oidc_issuer}"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

resource "aws_iam_role" "github_terraform" {
  name                 = "xalians-github-terraform"
  description          = "GitHub Actions OIDC role for terraform plan/apply of Xalians backend"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "${local.github_oidc_issuer}:aud" = "sts.amazonaws.com"
        }
        # The pull_request entry is intentionally NOT branch-scoped, so
        # `terraform plan` runs on PRs from any branch. That means a green
        # PR does NOT prove the post-merge apply can authenticate -- only
        # the ref entry below governs that.
        StringLike = {
          "${local.github_oidc_issuer}:sub" = [
            "repo:${local.github_repo}:ref:refs/heads/${local.github_actions_branch}",
            "repo:${local.github_repo}:pull_request",
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_terraform" {
  name = "xalians-terraform-deploy"
  role = aws_iam_role.github_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = [
          "arn:aws:s3:::${local.terraform_state_bucket}",
          "arn:aws:s3:::${local.terraform_state_bucket}/*",
        ]
      },
      {
        Sid    = "ManagedBuckets"
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          "arn:aws:s3:::chronic-labs-*",
          "arn:aws:s3:::chronic-labs-*/*",
          "arn:aws:s3:::xalians.com",
          "arn:aws:s3:::xalians.com/*",
        ]
      },
      {
        Sid      = "Lambda"
        Effect   = "Allow"
        Action   = ["lambda:*"]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:*"
      },
      {
        Sid      = "ApiGateway"
        Effect   = "Allow"
        Action   = ["apigateway:*"]
        Resource = "arn:aws:apigateway:${var.aws_region}::/*"
      },
      {
        Sid    = "LambdaExecRole"
        Effect = "Allow"
        Action = [
          "iam:GetRole", "iam:CreateRole", "iam:DeleteRole", "iam:UpdateRole",
          "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies", "iam:GetRolePolicy", "iam:PutRolePolicy",
          "iam:DeleteRolePolicy", "iam:TagRole", "iam:UntagRole",
          "iam:ListInstanceProfilesForRole",
        ]
        Resource = aws_iam_role.lambda_exec.arn
      },
      {
        Sid       = "PassLambdaExecRole"
        Effect    = "Allow"
        Action    = ["iam:PassRole"]
        Resource  = aws_iam_role.lambda_exec.arn
        Condition = { StringEquals = { "iam:PassedToService" = "lambda.amazonaws.com" } }
      },
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:*"]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:*"
      },
      {
        Sid    = "Route53Zone"
        Effect = "Allow"
        Action = [
          "route53:GetHostedZone", "route53:ListResourceRecordSets",
          "route53:ChangeResourceRecordSets", "route53:ListTagsForResource",
        ]
        Resource = "arn:aws:route53:::hostedzone/${var.hosted_zone_id}"
      },
      {
        Sid      = "Route53Reads"
        Effect   = "Allow"
        Action   = ["route53:GetChange", "route53:ListHostedZones", "route53:ListHostedZonesByName"]
        Resource = "*"
      },
      {
        Sid      = "AcmReads"
        Effect   = "Allow"
        Action   = ["acm:DescribeCertificate", "acm:ListCertificates", "acm:ListTagsForCertificate"]
        Resource = "*"
      },
      # Without these the role cannot refresh the two resources above, and
      # every `terraform plan` in CI fails with AccessDenied on itself.
      # Deliberately excludes Delete*/CreateRole so a bad plan cannot
      # destroy the credentials CI depends on.
      {
        Sid    = "SelfManageOidcRole"
        Effect = "Allow"
        Action = [
          "iam:GetRole", "iam:UpdateRole", "iam:UpdateAssumeRolePolicy",
          "iam:GetRolePolicy", "iam:PutRolePolicy", "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies", "iam:ListRoleTags", "iam:TagRole",
          "iam:UntagRole", "iam:ListInstanceProfilesForRole",
        ]
        Resource = aws_iam_role.github_terraform.arn
      },
      {
        Sid    = "SelfManageOidcProvider"
        Effect = "Allow"
        Action = [
          "iam:GetOpenIDConnectProvider", "iam:UpdateOpenIDConnectProviderThumbprint",
          "iam:AddClientIDToOpenIDConnectProvider", "iam:RemoveClientIDFromOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider", "iam:UntagOpenIDConnectProvider",
          "iam:ListOpenIDConnectProviderTags",
        ]
        Resource = aws_iam_openid_connect_provider.github.arn
      },
    ]
  })
}
