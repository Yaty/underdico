workflow "Deploy" {
  on = "push"
  resolves = [
    "Lint",
    "Tag image for GCR",
    "Verify GKE deployment",
  ]
}

action "GitHub Action for Docker" {
  uses = "actions/docker/cli@master"
  args = "build -t underdico ."
}

action "Test" {
  uses = "actions/docker/cli@master"
  needs = ["GitHub Action for Docker"]
  args = "run underdico npm run test:e2e"
}

action "Lint" {
  uses = "actions/docker/cli@master"
  needs = ["GitHub Action for Docker"]
  args = "run underdico npm run lint"
}

action "On master" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  needs = ["Test", "Lint"]
  args = "branch master"
}

action "Setup Google Cloud" {
  uses = "actions/gcloud/auth@master"
  needs = ["On master"]
  secrets = ["GCLOUD_AUTH"]
}

action "Tag image for GCR" {
  uses = "actions/docker/tag@master"
  needs = ["Setup Google Cloud"]
  args = "[\"underdico\", \"gcr.io/$PROJECT_ID/$APPLICATION_NAME\"]"
  secrets = [
    "APPLICATION_NAME",
    "PROJECT_ID",
  ]
}

action "Set Credential Helper for Docker" {
  uses = "actions/gcloud/cli@master"
  needs = ["Tag image for GCR"]
  args = "[\"auth\", \"configure-docker\", \"--quiet\"]"
}

action "Push image to GCR" {
  uses = "actions/gcloud/cli@master"
  needs = ["Set Credential Helper for Docker"]
  runs = "sh -c"
  args = "[\"docker push gcr.io/$PROJECT_ID/$APPLICATION_NAME\"]"
  secrets = [
    "APPLICATION_NAME",
    "PROJECT_ID",
  ]
}

action "Load GKE kube credentials" {
  uses = "actions/gcloud/cli@master"
  needs = ["Push image to GCR"]
  args = "container clusters get-credentials cluster-1 --zone europe-west1-c --project $PROJECT_ID"
  secrets = ["PROJECT_ID"]
}

action "Deploy to GKE" {
  uses = "docker://gcr.io/cloud-builders/kubectl"
  needs = ["Load GKE kube credentials"]
  runs = "sh -l -c"
  args = "[\"SHORT_REF=$(echo ${GITHUB_SHA} | head -c7) && cat $GITHUB_WORKSPACE/config.yml | sed 's/PROJECT_ID/'\\\"$PROJECT_ID\\\"'/' | sed 's/APPLICATION_NAME/'\\\"$APPLICATION_NAME\\\"'/' | sed 's/TAG/'\\\"$SHORT_REF\\\"'/' | kubectl apply -f - \"]"
  secrets = [
    "APPLICATION_NAME",
    "DEPLOYMENT_NAME",
    "PROJECT_ID",
  ]
}

action "Verify GKE deployment" {
  uses = "docker://gcr.io/cloud-builders/kubectl"
  needs = ["Deploy to GKE"]
  args = "rollout status deployment/$DEPLOYMENT_NAME"
  secrets = ["DEPLOYMENT_NAME"]
}
