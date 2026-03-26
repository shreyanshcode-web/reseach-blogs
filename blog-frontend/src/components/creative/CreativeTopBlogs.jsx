import React from 'react';
import InfiniteCircularGallery from './InfiniteCircularGallery';

export default function CreativeTopBlogs({ posts = [], inView }) {
  // Mock data if none provided
  const topPosts = posts.length > 0 ? posts.slice(0, 10) : [
    { id: 1, title: "The Future of Generative AI", author: "Alex Rivera" },
    { id: 2, title: "Modern WebGL for Creative Devs", author: "Sarah Chen" },
    { id: 3, title: "Designing for the Next Billion", author: "Marcus Thorne" },
    { id: 4, title: "The Ethics of Digital Identity", author: "Elena Rossi" },
    { id: 5, title: "Quantum Computing: A Primer", author: "David Wu" },
    { id: 6, title: "Neural Networks in Art", author: "Lia Vora" },
    { id: 7, title: "Sustainable Tech Architecture", author: "John Doe" },
    { id: 8, title: "The Metaverse Reality Check", author: "Jane Smith" },
    { id: 9, title: "Biotech's Next Frontier", author: "Alice Wong" },
    { id: 10, title: "Robotics and Human Labor", author: "Robert Brown" },
  ];

  return (
    <section className="c-full-section" id="top-blogs" style={{ minHeight: '100vh', padding: 0 }}>
      <InfiniteCircularGallery items={topPosts} title="Top Blogs of the Week" inView={inView} />
    </section>
  );
}
