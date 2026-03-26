import React from 'react';
import InfiniteCircularGallery from './InfiniteCircularGallery';

export default function CreativeTopWriters({ writers = [], inView }) {
  // Mock data for top writers
  const topWriters = writers.length > 0 ? writers : [
    { id: 1, username: "aara_dev", name: "Aara" },
    { id: 2, username: "shreyas", name: "Shreyas" },
    { id: 3, username: "nebula_9", name: "Nebula" },
    { id: 4, username: "pixel_king", name: "Pixel" },
    { id: 5, username: "cyber_ghost", name: "Ghost" },
    { id: 6, username: "zen_master", name: "Zen" },
    { id: 7, username: "code_witch", name: "Witch" },
    { id: 8, username: "data_monk", name: "Monk" },
  ];

  return (
    <section className="c-full-section c-writers-section" id="top-writers" style={{ minHeight: '100vh', padding: 0 }}>
      <InfiniteCircularGallery items={topWriters} title="Top Blog Writer of the Month" isWriter inView={inView} />
    </section>
  );
}
