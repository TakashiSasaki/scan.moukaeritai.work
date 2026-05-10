const { MetricServiceClient } = require("@google-cloud/monitoring");
const metricClient = new MetricServiceClient({
  projectId: 'moukaeritaid',
  credentials: {
      client_email: "dummy@moukaeritaid.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDE\n-----END PRIVATE KEY-----\n"
  }
});
async function run() {
  const projectId = "moukaeritaid";
  const now = Date.now();
  const startTime = { seconds: Math.floor((now - 1000 * 60 * 60) / 1000) };
  const endTime = { seconds: Math.floor(now / 1000) };
  
  try {
    const [timeSeries] = await metricClient.listTimeSeries({
      name: metricClient.projectPath(projectId),
      filter: 'metric.type="firestore.googleapis.com/document/read_count" AND resource.labels.database_id="photo-moukaeritai-work"',
      interval: { startTime, endTime },
    });
    console.log("Firestore timeSeries length:", timeSeries.length);
  } catch (e) {
    console.error("Firestore metrics error:", e.message);
  }
}
run();
