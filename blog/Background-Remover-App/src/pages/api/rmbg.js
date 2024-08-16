import * as sdk from "@google-cloud/aiplatform";

const endpoint = process.env.MODEL_ENDPOINT;
const apiEndpoint = process.env.API_ENDPOINT;
const clientOptions = {
  apiEndpoint: apiEndpoint, // 'asia-northeast1-aiplatform.googleapis.com'
};

const predictionServiceClient = new sdk.v1.PredictionServiceClient(clientOptions);

export default async function handler(req, res) {
  const [id, image] = [req.body.id, req.body.image];
  const [box, points, labels] = [req.body.box, req.body.points, req.body.labels];

  const instance = {id: id, image: image};
  if (box.toString() !== [0, 0, 0, 0].toString()) instance.box = box;
  if (points.length > 0) [instance.points, instance.labels] = [points, labels];

  const instanceValue = sdk.helpers.toValue(instance);
  const parameters = {
    structValue: {
      fields: {},
    },
  };
  const instances = [instanceValue];
  const request = {
    endpoint,
    instances,
    parameters,
  };

  const [response] = await predictionServiceClient.predict(request);
  const predictions = response.predictions;
  const newImage = predictions[0].structValue.fields.image.stringValue;
  res.status(200).json({image: newImage});
}
