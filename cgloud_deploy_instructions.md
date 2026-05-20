# Instructions to deploy
```bash
brew install google-cloud-sdk  # macOS
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com
```

```bash
cd packages/solver/
```

```bash
gcloud functions deploy solve-road-trip \
  --gen2 \
  --runtime=python312 \
  --region=australia-southeast1 \
  --source=. \
  --entry-point=solve_road_trip \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s
```

If above fails run this vv then run above ^^ again. 
```bash
gcloud projects add-iam-policy-binding atlas-496813 \
  --member=serviceAccount:523934066929@cloudbuild.gserviceaccount.com \
  --role=roles/cloudfunctions.developer
```

Take the link it gives you and put in .env
```
ROADTRIP_SOLVER_URL=link^^
```
Done!

Can test deployed func with
```bash
node test-roadtrip-api.js
```

Also can test the non deployed one with the python tester in packages/solver
Just make a venv or whatever and install requirements