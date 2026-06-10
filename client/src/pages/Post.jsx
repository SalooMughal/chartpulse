import { useParams, Link } from "react-router-dom";
import { posts } from "../content/posts.js";
import WaitlistForm from "../components/WaitlistForm.jsx";

export default function Post() {
  const { slug } = useParams();
  const post = posts.find((p) => p.slug === slug);

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
