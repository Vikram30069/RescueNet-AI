# RescueNet AI — AWS Deployment Architecture

This document outlines the AWS-ready deployment architecture for moving from local development to a production-grade cloud deployment.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                         USERS                              │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTPS
                            ▼
┌────────────────────────────────────────────────────────────┐
│              AWS CloudFront (CDN + SSL)                     │
│              + Route 53 (DNS)                              │
└───────────────────────────┬────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  AWS Amplify or     │      │  Application Load Balancer   │
│  S3 Static Hosting  │      │  (ALB)                       │
│  (Next.js frontend) │      └──────────────┬───────────────┘
└─────────────────────┘                     │
                                            ▼
                            ┌───────────────────────────────┐
                            │   ECS Fargate Cluster         │
                            │   ┌───────────────────────┐   │
                            │   │  FastAPI Container    │   │
                            │   │  (rescuenet-backend)  │   │
                            │   └───────────────────────┘   │
                            └──────────────┬────────────────┘
                                           │
              ┌────────────────────────────┼───────────────────┐
              ▼                            ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│   AWS RDS           │  │   AWS S3             │  │  AWS Secrets     │
│   (PostgreSQL)      │  │   (file storage,     │  │  Manager         │
│                     │  │    incident media)   │  │  (API keys, DB   │
└─────────────────────┘  └─────────────────────┘  │   credentials)   │
                                                   └──────────────────┘
                                           │
              ┌────────────────────────────┼───────────────────┐
              ▼                            ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│   AWS Bedrock       │  │   AWS SNS            │  │  AWS CloudWatch  │
│   (LLM inference    │  │   (SMS/push alerts)  │  │  (logs, metrics, │
│    via Bedrock)     │  │                      │  │   alarms)        │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘
                                           │
                            ┌──────────────▼────────────────┐
                            │   Amazon Connect               │
                            │   (automated voice calls to    │
                            │    hospitals and field teams)  │
                            └───────────────────────────────┘
```

---

## Service Breakdown

### Frontend: AWS Amplify
- Deploy Next.js App Router directly to AWS Amplify
- Amplify handles build, CDN distribution, and preview environments
- Alternative: Build static export and host on S3 + CloudFront

**Setup**:
```bash
npm install -g @aws-amplify/cli
amplify init
amplify push
# Or connect Amplify to GitHub for automatic deployments
```

---

### Backend: AWS ECS Fargate
- FastAPI runs in a Docker container on ECS Fargate (serverless containers)
- Application Load Balancer routes HTTPS traffic to Fargate tasks
- Auto-scaling based on CPU and request count

**Dockerfile** (backend):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**ECS Task Definition key settings**:
- Memory: 1024 MB (minimum)
- CPU: 512 units
- Environment vars loaded from Secrets Manager

---

### Database: AWS RDS PostgreSQL
- RDS PostgreSQL 15 in private VPC subnet
- Enable automated backups with 7-day retention
- Use connection pooling (PgBouncer) for production load

**Migration**: Run `database/schema.sql` against RDS on first deploy.

---

### Storage: AWS S3
- Bucket for incident media (photos, documents)
- Bucket for static assets if not using Amplify
- Enable versioning and lifecycle policies

---

### LLM Inference: AWS Bedrock
- Replace `OPENAI_API_KEY` or `GEMINI_API_KEY` with Bedrock for production
- Recommended model: `anthropic.claude-3-sonnet-20240229-v1:0`
- Set `LLM_PROVIDER=bedrock` and `AWS_BEDROCK_MODEL_ID` in Secrets Manager

**CrewAI Bedrock integration**:
```python
from langchain_aws import ChatBedrock
llm = ChatBedrock(model_id="anthropic.claude-3-sonnet-20240229-v1:0")
```

---

### Alerts: AWS SNS + Amazon Connect
- **SNS**: Push SMS notifications to rescue teams and coordinators
- **Amazon Connect**: Automated voice calls to hospitals with casualty estimates
- Both are mocked in MVP; wire up by replacing mock functions in `agents/definitions/communication_agent.py`

---

### Logging: AWS CloudWatch
- Container logs streamed from ECS to CloudWatch Log Groups
- Set up CloudWatch Alarms for:
  - API error rate > 5%
  - ECS task crash restarts
  - Database connection failures

---

### Secrets: AWS Secrets Manager
- Store all API keys, DB credentials, and integration tokens
- Backend reads secrets at startup via `boto3` client

```python
import boto3, json
def get_secret(name):
    client = boto3.client("secretsmanager", region_name="us-east-1")
    return json.loads(client.get_secret_value(SecretId=name)["SecretString"])
```

---

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create ECR repository and push Docker image
- [ ] Create ECS cluster, task definition, and service
- [ ] Create RDS instance and run schema migration
- [ ] Create S3 buckets with correct policies
- [ ] Configure Secrets Manager with all API keys
- [ ] Connect Amplify to GitHub repo for frontend
- [ ] Configure CloudFront distribution with ALB origin
- [ ] Set up CloudWatch log groups and alarms
- [ ] Enable SNS topic for alerts
- [ ] Test end-to-end with a sample incident

---

## Cost Estimate (Minimal Setup)

| Service | Tier | Estimated Monthly Cost |
|---|---|---|
| ECS Fargate | 0.25 vCPU, 512MB, 24/7 | ~$15 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15 |
| S3 | 10GB storage | < $1 |
| CloudFront | 10GB transfer | ~$1 |
| Amplify | Build minutes | ~$2 |
| Secrets Manager | 5 secrets | < $1 |
| SNS | 100 SMS/month | < $1 |
| **Total** | | **~$35/month** |
