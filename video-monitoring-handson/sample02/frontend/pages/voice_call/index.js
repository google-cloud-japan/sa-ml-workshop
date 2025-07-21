import Head from "next/head";
import Link from "next/link";
import Script from "next/script";
import PhoneEmulator from "components/PhoneEmulator";

export default function Index() {
  const element = (
    <>
      <Head>
        <title>Phone Emulator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PhoneEmulator />
    </>
  );

  return element;
}
