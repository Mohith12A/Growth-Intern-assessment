import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Play } from 'lucide-react';
import { learnerLinkedInPost, learnerVideos, type LearnerVideo } from './data/trustStories';

function VideoModal({ video, onClose }: { video: LearnerVideo | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (video && !element.open) element.showModal();
    if (!video && element.open) element.close();
  }, [video]);
  return <dialog className="story-modal" ref={dialog} aria-label={video ? `Video: ${video.title}` : undefined} onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    {video && <div className="story-modal-inner"><div className="story-modal-head"><div><span className="story-eyebrow">{video.attribution}</span><h3>{video.title}</h3></div><button type="button" className="story-close" aria-label="Close video" onClick={onClose}>×</button></div><div className="story-player"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><a className="story-original-link" href={video.sourceUrl} target="_blank" rel="noopener noreferrer">Open original on YouTube <ExternalLink size={14}/></a></div>}
  </dialog>;
}

function VideoCard({ video, onPlay, featured = false }: { video: LearnerVideo; onPlay: (video: LearnerVideo) => void; featured?: boolean }) {
  return <article className={featured ? 'story-video-card story-video-featured' : 'story-video-card'}>
    <button type="button" className="story-thumb" onClick={() => onPlay(video)} aria-label={`Play ${video.title}`}>
      <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }}/>
      <span className="story-play"><Play size={20} fill="currentColor"/></span><span className="story-thumb-tag">YT · LEARNER STORY</span>
    </button>
    <div className="story-video-copy"><span className="story-eyebrow">{video.attribution}</span><h3>{video.title}</h3><p>{video.summary}</p><button type="button" className="story-watch" onClick={() => onPlay(video)}>Watch story <ArrowRight size={14}/></button></div>
  </article>;
}

export default function TrustStories() {
  const [selectedVideo, setSelectedVideo] = useState<LearnerVideo | null>(null);
  const [activeStory, setActiveStory] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const scrollToStory = (index: number) => {
    const next = (index + learnerVideos.length) % learnerVideos.length;
    setActiveStory(next);
    rail.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  return <>
    <section className="trust-section section-pad" id="stories">
      <div className="section-kicker">REAL STORIES. REAL LEARNING. REAL PROJECTS. <span>- FROM PUBLIC SOURCES</span></div>
      <div className="trust-heading"><div><h2>See what happens when<br/>learning turns into <em>building.</em></h2></div><p>Explore NxtWave learner videos and a practical AI project preview. These learner stories come from public NxtWave sources; they are not AI Project Arena participants.</p></div>
      <div className="trust-feature"><div className="trust-feature-copy"><span className="story-eyebrow">FEATURED LEARNER VIDEO</span><h3>Real learning, shared by learners.</h3><p>Hear directly from learners in videos published or shared by NxtWave.</p><a className="button button-lime" href="#stories-carousel">Watch student stories <ArrowRight size={15}/></a></div><VideoCard video={learnerVideos[0]} onPlay={setSelectedVideo} featured/></div>
      <div className="story-carousel-head" id="stories-carousel"><div><span className="story-eyebrow">LEARNER JOURNEYS</span><h3>Stories from the community</h3></div><div className="story-controls"><button type="button" aria-label="Previous learner story" onClick={() => scrollToStory(activeStory - 1)}><ArrowLeft size={16}/></button><button type="button" aria-label="Next learner story" onClick={() => scrollToStory(activeStory + 1)}><ArrowRight size={16}/></button></div></div>
      <div className="story-rail" ref={rail} onScroll={event => { const node = event.currentTarget; const card = node.querySelector<HTMLElement>('.story-video-card'); if (card) setActiveStory(Math.min(learnerVideos.length - 1, Math.round(node.scrollLeft / (card.offsetWidth + 16)))); }}>
        {learnerVideos.map(video => <VideoCard key={video.id} video={video} onPlay={setSelectedVideo}/>)}
      </div>
      <div className="story-dots" role="group" aria-label="Choose learner story">{learnerVideos.map((video, index) => <button key={video.id} type="button" aria-label={`Show story ${index + 1}: ${video.title}`} aria-current={activeStory === index ? 'true' : undefined} onClick={() => scrollToStory(index)}/>)}</div>
      <div className="trust-lower-grid">
        <article className="project-demo-card"><span className="story-eyebrow">FEATURED YOUTUBE VIDEO</span><h3>AI Engineer<br/><em>Success Story.</em></h3><p>Watch the learner video shared with your links and explore one person’s journey into AI engineering.</p><VideoCard video={learnerVideos[2]} onPlay={setSelectedVideo} featured/><small className="demo-note">This is a learner success story, not a walkthrough of an AI Project Arena build. Send a project demo link when you want that featured here.</small></article>
        <div className="trust-side"><article className="linkedin-story"><span className="linkedin-mark">in</span><span className="story-eyebrow">LEARNER JOURNEYS BEYOND THE CLASSROOM</span><h3>{learnerLinkedInPost.title}</h3><p>View the original public post and follow its source for the full context.</p><span className="story-eyebrow">Published by {learnerLinkedInPost.attribution}</span><a href={learnerLinkedInPost.url} target="_blank" rel="noopener noreferrer">View original post <ExternalLink size={14}/></a></article><div className="trust-proof"><span className="story-eyebrow">BUILT ON TRANSPARENCY</span><p><b>Public source links</b><small>Explore original videos and posts.</small></p><p><b>Challenge details shared clearly</b><small>Event instructions and criteria will be shared with participants.</small></p><p><b>Reward terms to be confirmed</b><small>Eligibility and judging details will be announced officially.</small></p></div></div>
      </div>
      <div className="trust-final-cta"><div><span className="story-eyebrow">YOUR TURN</span><h3>Ready to put your AI skills to the test?</h3><p>Move beyond the fundamentals. Take on a hands-on challenge and discover what you can build.</p></div><div><a className="button button-lime" href="#register">Register for AI Project Arena <ArrowRight size={15}/></a><a className="text-link" href="#format">See how the challenge works <ArrowRight size={14}/></a></div></div>
    </section>
    <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)}/>
  </>;
}
