import fs from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'sdmaapp-rules-test';

function buildValidCategory(id = 'cat-perencanaan-pengadaan', authorUid = 'admin-1') {
  return {
    id,
    name: 'Perencanaan Kebutuhan dan Pengadaan ASN',
    slug: 'perencanaan-kebutuhan-dan-pengadaan-asn',
    description: 'Kebijakan formasi nasional ASN.',
    iconName: 'UserCheck',
    group: 'klaster',
    colorScheme: 'blue',
    order: 0,
    isPublic: true,
    authorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildValidDeputyNews(id = 'news-1', authorUid = 'admin-1') {
  return {
    id,
    title: 'KemenPANRB Perkuat Transformasi SDM Aparatur',
    articleUrl: 'https://www.menpan.go.id/site/berita-terkini/kemenpanrb-perkuat-sdma',
    thumbnailUrl: 'https://www.menpan.go.id/images/thumb.jpg',
    publicationDate: '2026-10-28',
    summary: 'Ringkasan berita resmi Kedeputian Bidang SDM Aparatur.',
    category: 'Transformasi ASN',
    status: 'published',
    authorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildValidPolicy(id = 'pol-1', categoryId = 'cat-perencanaan-pengadaan', authorUid = 'admin-1', status = 'published') {
  return {
    id,
    title: 'Kebijakan Jabatan Pelaksana ASN',
    slug: 'kebijakan-jabatan-pelaksana-asn',
    categoryId,
    summary: 'Ringkasan kebijakan jabatan pelaksana.',
    contextHeader: '',
    contextExplanation: 'Penjelasan latar belakang.',
    simultaneousExplanation: '',
    generalContent: '',
    classifications: [],
    requirementsHeader: '',
    requirements: [],
    processStepsHeader: '',
    processSteps: [],
    faqs: [],
    thumbnail: '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg',
    instagramPostUrl: 'https://www.instagram.com/p/ABC123/',
    instagramThumbnail: '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg',
    isCustomThumbnail: false,
    customThumbnail: '',
    autoThumbnail: '/src/assets/images/infographic_jabatan_pelaksana_1790755819303.jpg',
    instagramDate: '28 Oktober 2026',
    instagramAccountHandle: '@sdmapanrb',
    status,
    sources: [],
    relatedPolicyIds: [],
    publicationDate: '28 Oktober 2026',
    isFeatured: false,
    aiAssisted: false,
    aiSummary: '',
    isAiSummaryApproved: false,
    aiSummaryGeneratedAt: '',
    instagramCaption: '',
    authorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function runDirtyDozenSecurityTests(): Promise<void> {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });

  try {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const adminDb = testEnv
      .authenticatedContext('admin-1', {
        email: 'sitianggraini.s.02@gmail.com',
        email_verified: true,
      })
      .firestore();
    const spoofUnverifiedDb = testEnv
      .authenticatedContext('spoof-1', {
        email: 'sitianggraini.s.02@gmail.com',
        email_verified: false,
      })
      .firestore();
    const regularUserDb = testEnv
      .authenticatedContext('user-99', {
        email: 'visitor@example.com',
        email_verified: true,
      })
      .firestore();

    // Seed valid category as verified bootstrapped admin
    await assertSucceeds(
      setDoc(doc(adminDb, 'categories', 'cat-perencanaan-pengadaan'), buildValidCategory())
    );

    // 1. Unauthenticated write -> DENIED
    await assertFails(
      setDoc(doc(anonDb, 'policies', 'pol-1'), buildValidPolicy('pol-1'))
    );

    // 2. Email Spoofing Attack (email_verified == false) -> DENIED
    await assertFails(
      setDoc(doc(spoofUnverifiedDb, 'categories', 'cat-spoof'), buildValidCategory('cat-spoof', 'spoof-1'))
    );

    // 3. Self-Assigned Admin Privilege Escalation -> DENIED
    await assertFails(
      setDoc(doc(regularUserDb, 'admins', 'user-99'), {
        uid: 'user-99',
        email: 'visitor@example.com',
        name: 'Attacker',
        role: 'superadmin',
        department: 'External',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Seed admin profile by real admin, then test 4. PII Leak on /admins -> DENIED
    await assertSucceeds(
      setDoc(doc(adminDb, 'admins', 'adm-01'), {
        uid: 'adm-01',
        email: 'editor@menpan.go.id',
        name: 'Official Admin',
        role: 'superadmin',
        department: 'SDMA',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(getDoc(doc(regularUserDb, 'admins', 'adm-01')));
    await assertFails(getDocs(collection(regularUserDb, 'admins')));

    // 5. Shadow Field Injection ("Ghost Field") -> DENIED
    await assertFails(
      setDoc(doc(adminDb, 'deputyNews', 'news-ghost'), {
        ...buildValidDeputyNews('news-ghost'),
        isSuperVerified: true,
      })
    );

    // 6. Draft Policy Scraping by Public Visitor -> DENIED
    await assertSucceeds(
      setDoc(
        doc(adminDb, 'policies', 'pol-draft'),
        buildValidPolicy('pol-draft', 'cat-perencanaan-pengadaan', 'admin-1', 'draft')
      )
    );
    await assertFails(getDoc(doc(anonDb, 'policies', 'pol-draft')));
    await assertFails(getDocs(collection(anonDb, 'policies')));
    // Public query filtering status == 'published' -> SUCCEEDS
    await assertSucceeds(
      getDocs(query(collection(anonDb, 'policies'), where('status', '==', 'published')))
    );

    // 7. Orphaned Foreign Key (non-existent categoryId) -> DENIED
    await assertFails(
      setDoc(
        doc(adminDb, 'policies', 'pol-orphan'),
        buildValidPolicy('pol-orphan', 'cat-non-existent', 'admin-1', 'published')
      )
    );

    // 8. Identity Spoofing (authorUid != request.auth.uid) -> DENIED
    await assertFails(
      setDoc(doc(adminDb, 'deputyNews', 'news-spoof-uid'), buildValidDeputyNews('news-spoof-uid', 'other-uid'))
    );

    // 9. Client Timestamp Forgery -> DENIED
    await assertFails(
      setDoc(doc(adminDb, 'deputyNews', 'news-forged-time'), {
        ...buildValidDeputyNews('news-forged-time'),
        createdAt: Timestamp.fromMillis(1700000000000),
      })
    );

    // Seed valid DeputyNews, then test 10 & 12
    await assertSucceeds(
      setDoc(doc(adminDb, 'deputyNews', 'news-valid'), buildValidDeputyNews('news-valid'))
    );

    // 10. Immortal Field Mutation (changing authorUid on update) -> DENIED
    await assertFails(
      updateDoc(doc(adminDb, 'deputyNews', 'news-valid'), {
        authorUid: 'hijacked-uid',
        updatedAt: serverTimestamp(),
      })
    );

    // 11. ID Poisoning (invalid characters / length > 128) -> DENIED
    const poisonedId = 'bad$id!' + 'x'.repeat(140);
    await assertFails(
      setDoc(doc(adminDb, 'categories', poisonedId), buildValidCategory(poisonedId))
    );

    // 12. Value Poisoning on Update (oversized string > 300 chars on title) -> DENIED
    await assertFails(
      updateDoc(doc(adminDb, 'deputyNews', 'news-valid'), {
        title: 'A'.repeat(400),
        updatedAt: serverTimestamp(),
      })
    );
  } finally {
    await testEnv.cleanup();
  }
}
