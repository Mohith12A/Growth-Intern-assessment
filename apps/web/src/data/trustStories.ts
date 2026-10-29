export type LearnerVideo = {
  id: string;
  title: string;
  summary: string;
  attribution: string;
  sourceUrl: string;
};

export const learnerVideos: LearnerVideo[] = [
  {
    id: 'MP1KTyS01tc',
    title: 'CCBP 4.0 Reviews | NxtWave',
    summary: 'A NxtWave learner story shared on the official channel.',
    attribution: 'NxtWave on YouTube',
    sourceUrl: 'https://www.youtube.com/watch?v=MP1KTyS01tc',
  },
  {
    id: 'R4EdUACKVrs',
    title: 'Fresher to Software Engineer Through NxtWave',
    summary: 'A learner shares their experience with projects and interview preparation.',
    attribution: 'NxtWave learner video',
    sourceUrl: 'https://www.youtube.com/watch?v=R4EdUACKVrs',
  },
  {
    id: 'KVEyrQces-g',
    title: 'AI Engineer Success Story',
    summary: 'A learner video linked from a public NxtWave LinkedIn post.',
    attribution: 'Video linked by NxtWave on LinkedIn',
    sourceUrl: 'https://youtu.be/KVEyrQces-g',
  },
];

export const learnerLinkedInPost = {
  title: 'NxtWave student review and internship story',
  attribution: 'NxtWave on LinkedIn',
  url: 'https://www.linkedin.com/posts/nxtwavetech_nxtwave-ccbp-40-academy-student-review-activity-7155524879599964160-XIvK',
};
