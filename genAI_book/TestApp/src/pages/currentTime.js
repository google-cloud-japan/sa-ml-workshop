import Head from "next/head";
import Link from "next/link";
import CurrentTime from "components/CurrentTime";

export default function CurrentTimePage() {
  const element = (
    <>    
      <Head>
        <title>Current Time</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>Current Time</h1>
      <h2><CurrentTime /></h2>
      <h3><Link href="./">Home Page</Link></h3>
    </>
  );

  return element;
}
