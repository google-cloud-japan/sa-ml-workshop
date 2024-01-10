import { verifyIdToken } from "lib/verifyIdToken";

export default async function handler(req, res) {
  // Client verification
  const decodedToken = await verifyIdToken(req);
  if (! decodedToken) {
    res.status(401).end();
    return;
  }

  console.log(decodedToken);

  const text = req.body.text;
  const string = text.replace(/\r\n|\r/g, " ");
  const chars = string.replace(/\s+/g, "").length;
  let words = 0;
  if (chars > 0) {
    words = string.trim().split(/\s+/).length;
  }

  const data = {
    words: words,
    chars: chars,
  }

  res.status(200).json(data);
}
