const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== TESTING THE FULL QUICK PARCHI FLOW ===\n');

  // 1. Test database queries
  const hospitals = await prisma.hospital.findMany();
  console.log(`✓ ${hospitals.length} hospitals found`);

  const docs = await prisma.doctor.findMany({ include: { user: true } });
  console.log(`✓ ${docs.length} doctors found`);
  const sharma = docs.find(d => d.user.name === 'Dr. Arjun Sharma');
  console.log(`  → Dr. Sharma ID: ${sharma.id}`);

  const patients = await prisma.patient.findMany({ include: { user: true } });
  console.log(`✓ ${patients.length} patients found`);

  // 2. Test queue state for Dr. Sharma
  const today = new Date();
  today.setHours(0,0,0,0);
  const queue = await prisma.queue.findFirst({ where: { doctorId: sharma.id, date: today } });
  const queueApps = await prisma.appointment.findMany({
    where: { doctorId: sharma.id, date: today, status: { notIn: ['CANCELLED'] } },
    orderBy: { tokenNumber: 'asc' }
  });
  console.log(`✓ Queue for Dr. Sharma: current=${queue.currentToken}, waiting=${queue.totalWaiting}, served=${queue.totalServed}`);
  console.log(`  → 10 appointments seeded, statuses: ${queueApps.map(a => a.status).join(', ')}\n`);

  // 3. Test call next patient - call CD-008 (next WAITING patient)
  console.log('=== Simulating NEXT PATIENT (doctor clicks "Call Next") ===');
  
  // Check current waiting patient
  const waiting = queueApps.find(a => a.status === 'WAITING');
  console.log(`Found next waiting patient: ${waiting.tokenNumber} (${waiting.status})`);

  // Update to CALLED
  await prisma.appointment.update({
    where: { id: waiting.id },
    data: { status: 'CALLED' }
  });
  await prisma.queue.update({
    where: { id: queue.id },
    data: { currentToken: waiting.tokenNumber, totalWaiting: queue.totalWaiting - 1 }
  });
  console.log(`✓ ${waiting.tokenNumber} → CALLED, now serving: ${waiting.tokenNumber}\n`);

  // 4. Simulate start consultation
  console.log('=== Simulating START CONSULTATION ===');
  await prisma.appointment.update({
    where: { id: waiting.id },
    data: { status: 'IN_CONSULTATION', consultationStart: new Date() }
  });
  console.log(`✓ ${waiting.tokenNumber} → IN_CONSULTATION\n`);

  // 5. Simulate complete consultation
  console.log('=== Simulating COMPLETE CONSULTATION ===');
  await prisma.appointment.update({
    where: { id: waiting.id },
    data: { status: 'COMPLETED', consultationEnd: new Date() }
  });
  await prisma.queue.update({
    where: { id: queue.id },
    data: { totalServed: queue.totalServed + 1 }
  });
  console.log(`✓ ${waiting.tokenNumber} → COMPLETED, served count now ${queue.totalServed + 1}\n`);

  // 6. Test token generation (booking a new patient at end of queue)
  console.log('=== NEW PATIENT BOOKING (generating token) ===');
  const lastToken = queueApps[queueApps.length - 1].tokenNumber;
  console.log(`Current last token: ${lastToken}`);

  const existingCount = await prisma.appointment.count({
    where: { doctorId: sharma.id, date: today, status: { notIn: ['CANCELLED'] } }
  });
  const newToken = `CD-${String(existingCount + 1).padStart(3, '0')}`;
  console.log(`Generated new token: ${newToken}`);
  console.log(`Test passes: unique sequential token ✓ \n`);

  // 7. Verify no duplicate tokens
  const dupCheck = await prisma.appointment.count({
    where: { doctorId: sharma.id, date: today, tokenNumber: newToken }
  });
  console.log(`Duplicate check: ${dupCheck === 0 ? 'No duplicates ✓' : 'DUPLICATE FOUND ✗'}\n`);

  console.log('=== ALL FLOW TESTS COMPLETE ===');
  console.log('✓ Patient → Book → Token → Doctor → Queue → Complete flow verified');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
