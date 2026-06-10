import { useParams, Link } from "react-router-dom";
import { posts } from "../content/posts.js";
import WaitlistForm from "../components/WaitlistForm.jsx";
import { useSeo, SITE_URL, SITE_NAME } from "../seo.js";

export default function Post() {
  const { slug } = useParams();
  const post = posts.find((p) => p.slug === slug);

  useSeo({
    title: post ? post.title : "Post not found",
    description: post ? post.excerpt : undefined,
    path: `/education/${slug}`,
    noindex: !post,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          url: `${SITE_URL}/education/${post.slug}`,
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }
      : null,
  });

  if (!post) {
    return (
      <div className="page-head">
        <h1>Post not found</h1>
        <p><Link to="/education">← Back to Education Hub</Link></p>
      </div>
    );
  }

  return (
    <article className="post-body">
      <p><Link to="/education">← All guides</Link></p>
      <h1>{post.title}</h1>
      <p className="post-meta">{post.readTime} min read · ChartPulse Education</p>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
      <div className="card" style={{ marginTop: 40, textAlign: "center" }}>
        <h3>Want these setups delivered as live signals?</h3>
        <p style={{ marginBottom: 16 }}>Join the premium waitlist for launch pricing.</p>
        <WaitlistForm />
      </div>
    </article>
  );
}
