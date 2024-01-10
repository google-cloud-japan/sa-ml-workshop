import Head from "next/head";
import Link from "next/link";

export default function HomePage() {
  const element = (
    <>
      <Head>
        <title>Home Page</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>My First Next.js Application</h1>
      <h3><Link href="./currentTime">Current Time</Link></h3>
      <h3><Link href="./loginMenu">Login Menu</Link></h3>
    </>
  );

  return element;
}
