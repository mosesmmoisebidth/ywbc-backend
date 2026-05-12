import { config } from 'dotenv';
config({ override: true });

import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Seed only the *foundational* records — never sample content.
 *
 * What we seed:
 *   - 1 admin account (so the founder can log in)
 *   - 1 test user account (so QA has a normal-user login)
 *   - Daily quotes (curated brand content the founder approved)
 *   - FAQs (the static help corpus)
 *   - Nutrition tips (static, evidence-based)
 *
 * What we deliberately do NOT seed:
 *   - Psychologists, online conversations, articles — these are entered by
 *     the admin via the admin UI so production data is always real.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding YWBC database (foundational only)...');

  // 1. Admin
  const adminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'brave@yourwellbeingcenter.rw' },
    update: {},
    create: {
      email: 'brave@yourwellbeingcenter.rw',
      passwordHash: adminPasswordHash,
      fullName: 'Dr. Brave Olivier',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log(`  ✅ Admin: ${admin.email} (password: ChangeMe123!)`);

  // 2. Normal test user
  const userPasswordHash = await bcrypt.hash('TestUser123!', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@yourwellbeingcenter.rw' },
    update: {},
    create: {
      email: 'user@yourwellbeingcenter.rw',
      passwordHash: userPasswordHash,
      fullName: 'Aline Mukamana',
      role: 'USER',
      emailVerified: true,
      phone: '+250788312209',
    },
  });
  console.log(`  ✅ Test user: ${testUser.email} (password: TestUser123!)`);

  // 3. Daily quotes
  const quotes = [
    { text: 'Convince yourself every day that you are worthy of a good life.', author: 'Dr. Brave Olivier', category: 'MOTIVATION' as const },
    { text: "You don't have to carry it all today. Just the next gentle step.", author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'Healing is not a straight line. It is a slow returning to yourself.', author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'Rest is not a reward. It is a right.', author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'Your nervous system listens to your breath. Slow it, and it follows.', author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'Small consistent kindness to yourself rewires more than one big push ever will.', author: 'Dr. Brave Olivier', category: 'MOTIVATION' as const },
    { text: 'Naming a feeling halves its weight.', author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'You are allowed to begin again, even today.', author: 'Dr. Brave Olivier', category: 'MOTIVATION' as const },
    { text: 'Reconciliation begins inside, with the parts of us we exiled.', author: 'Dr. Brave Olivier', category: 'RECONCILIATION' as const },
    { text: 'A simple plate of greens, beans, and grains is medicine for the mind.', author: 'Dr. Brave Olivier', category: 'NUTRITION' as const },
    { text: 'Drink water before you reach for worry.', author: 'Dr. Brave Olivier', category: 'NUTRITION' as const },
    { text: 'What you eat in the morning shapes how you meet the afternoon.', author: 'Dr. Brave Olivier', category: 'NUTRITION' as const },
    { text: 'Fermented foods quietly calm an anxious gut.', author: 'Dr. Brave Olivier', category: 'NUTRITION' as const },
    { text: 'Less sugar, more sun. The mood often follows.', author: 'Dr. Brave Olivier', category: 'NUTRITION' as const },
    { text: 'Forgiveness, even partial, lightens what we carry forward.', author: 'Dr. Brave Olivier', category: 'RECONCILIATION' as const },
    { text: 'You can love your country and still need to grieve in it.', author: 'Dr. Brave Olivier', category: 'RECONCILIATION' as const },
    { text: 'A walk in soft light counts as therapy too.', author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: "Tomorrow's calm is built by tonight's bedtime.", author: 'Dr. Brave Olivier', category: 'WELLNESS' as const },
    { text: 'Asking for help is a strong, ancient act.', author: 'Dr. Brave Olivier', category: 'MOTIVATION' as const },
    { text: 'You are not behind. You are exactly where the next step needs you.', author: 'Dr. Brave Olivier', category: 'MOTIVATION' as const },
  ];
  const existingQuotes = await prisma.dailyQuote.count();
  if (existingQuotes === 0) {
    await prisma.dailyQuote.createMany({ data: quotes });
    console.log(`  ✅ Quotes: ${quotes.length}`);
  }

  // 4. FAQs
  const faqs = [
    { question: 'What is Your Wellbeing Center?', answer: "We're a Rwandan mental-health initiative founded by Dr. Brave Olivier. We offer therapy, online conversations, articles, meditations, and gentle nutrition guidance — all in Kinyarwanda or English.", category: 'GENERAL' as const, order: 1 },
    { question: 'Is my information kept private?', answer: 'Yes. Anything you share with a therapist or in your mood journal is private. We never share your personal information without your written consent.', category: 'GENERAL' as const, order: 2 },
    { question: 'Do you offer services in Kinyarwanda?', answer: 'Yes — most of our therapists work in Kinyarwanda, and the entire app can be switched to Ikinyarwanda from your profile settings.', category: 'GENERAL' as const, order: 3 },
    { question: 'What if I need urgent help?', answer: "If you're in immediate danger, please call Rwanda's emergency line (912) or go to the nearest hospital. Our chatbot is supportive but not an emergency service.", category: 'GENERAL' as const, order: 4 },
    { question: 'How do I find the right therapist?', answer: 'Browse our therapists by specialty (trauma, anxiety, couples, grief, family). Read their bios and pick the one who feels like the right fit for you. You can always switch later.', category: 'THERAPY' as const, order: 1 },
    { question: 'What does a session cost?', answer: 'Sessions vary by therapist and session type. Each profile lists the price clearly before you book.', category: 'THERAPY' as const, order: 2 },
    { question: 'Are sessions online or in-person?', answer: 'Both. You can choose online, in-person, or group when you book. Online sessions happen via a secure video link sent after payment is confirmed.', category: 'THERAPY' as const, order: 3 },
    { question: 'How long is each session?', answer: 'Standard therapy sessions are 50 minutes. Group conversations vary — usually 60–90 minutes.', category: 'THERAPY' as const, order: 4 },
    { question: 'How do I book a session?', answer: 'Tap **Book** in the bottom menu, choose your therapist, pick a time that works, and follow the gentle payment steps via MoMo.', category: 'BOOKING' as const, order: 1 },
    { question: 'How does payment work?', answer: 'After picking your time, you receive a MoMo USSD code. Send the fee to the listed number, then upload a screenshot or transaction ID. An admin reviews and confirms within a few hours.', category: 'BOOKING' as const, order: 2 },
    { question: 'What if my payment is declined?', answer: 'You will receive a kind note explaining why. Most often it is a mismatched amount or unclear screenshot. You can re-submit without re-booking.', category: 'BOOKING' as const, order: 3 },
    { question: 'Can I cancel a booking?', answer: 'Yes — you can cancel up to 24 hours before the session and receive a full refund. Closer than that, please contact us directly.', category: 'BOOKING' as const, order: 4 },
    { question: 'How does nutrition relate to mental health?', answer: 'Your gut and your mind are in constant conversation. Eating regularly, drinking enough water, and including greens, beans, and fermented foods can quietly steady anxiety and mood.', category: 'NUTRITION' as const, order: 1 },
    { question: 'Do you offer meal plans?', answer: 'Yes — we publish gentle Rwandan-rooted meal plans for stress, sleep, and energy. Find them under the Nutrition section of the home screen.', category: 'NUTRITION' as const, order: 2 },
    { question: 'Are these plans expensive to follow?', answer: 'No. We deliberately build plans around affordable, locally available ingredients — beans, ubunyobwa, ibirayi, isombe, amaru.', category: 'NUTRITION' as const, order: 3 },
  ];
  const existingFaqs = await prisma.fAQ.count();
  if (existingFaqs === 0) {
    await prisma.fAQ.createMany({ data: faqs });
    console.log(`  ✅ FAQs: ${faqs.length}`);
  }

  // 5. Nutrition tips
  const tips = [
    { title: 'Begin with water', description: 'Before coffee or tea, drink a glass of warm water. It softens the morning into the day.', icon: 'Droplets', category: 'morning' },
    { title: 'A handful of green', description: 'Add greens — isombe, dodo, amaranth — to one meal a day. Iron and folate quietly support a steady mood.', icon: 'Leaf', category: 'meal' },
    { title: 'Beans are your friend', description: "Rwandan beans are protein, fiber, and slow energy in one bowl. Eat them at least 4 days a week.", icon: 'Bean', category: 'protein' },
    { title: 'Fermented foods help', description: 'A spoon of yoghurt or a small bowl of ikivuguto with a meal supports your gut and your mind.', icon: 'Sparkles', category: 'gut-health' },
    { title: 'Sweet drinks last', description: 'Try water, milk, or unsweetened tea before reaching for soda. Less sugar means fewer afternoon crashes.', icon: 'Wine', category: 'mindful' },
  ];
  const existingTips = await prisma.nutritionTip.count();
  if (existingTips === 0) {
    await prisma.nutritionTip.createMany({ data: tips });
    console.log(`  ✅ Nutrition tips: ${tips.length}`);
  }

  console.log('\n🌿 Foundational seed complete. Add therapists, sessions, and articles via the admin UI.\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
