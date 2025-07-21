import Head from "next/head";
import Link from "next/link";
import Script from "next/script";
import VoiceClient from "components/VoiceClient";

export default function Index() {
  const element = (
    <>
      <Head>
        <title>Voice Client</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VoiceClient />
    </>
  );

  return element;
}
