#########################################################
#####          CREATURE STUDIO ART ARCHIVE          #####
#########################################################
# Off-machine copy of the Creature Studio keep set (docs/design/creature-studio.md,
# section 2): reference images, approved builds and their full rebuild closure, and
# every image shown to Nick. Objects are keyed by sha256 and never rewritten, so a
# file is uploaded once. Uploads run from Nick's machine with his own credentials;
# nothing in CI reads or writes objects here. Versioning keeps an accidental
# overwrite or delete recoverable.
resource "aws_s3_bucket" "art_archive" {
  bucket = "xalians-art-archive-${data.aws_caller_identity.current.account_id}"

  # The CI role gains rights to this bucket in the same apply.
  depends_on = [aws_iam_role_policy.github_terraform]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "art_archive" {
  bucket                  = aws_s3_bucket.art_archive.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "art_archive" {
  bucket = aws_s3_bucket.art_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "art_archive" {
  bucket = aws_s3_bucket.art_archive.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "art_archive" {
  bucket = aws_s3_bucket.art_archive.id

  rule {
    id     = "tidy"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # A replaced or deleted object stays recoverable for 90 days.
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

output "art_archive_bucket" {
  value = aws_s3_bucket.art_archive.bucket
}
