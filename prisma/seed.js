const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('demo123', 12);

  // Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@demo.com',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  // Create Hospitals
  const hospital1 = await prisma.hospital.create({
    data: {
      name: 'City Care Hospital',
      address: '45 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      phone: '+91 22 2345 6789',
      emergencyPhone: '+91 22 2345 0000',
      email: 'info@citycare.com',
      openingHours: '06:00',
      closingHours: '23:00',
      isOpen: true,
    },
  });

  const hospital2 = await prisma.hospital.create({
    data: {
      name: 'LifeLine Medical Center',
      address: '12 Park Street',
      city: 'Kolkata',
      state: 'West Bengal',
      phone: '+91 33 2456 7890',
      emergencyPhone: '+91 33 2456 0000',
      email: 'info@lifeline.com',
      openingHours: '07:00',
      closingHours: '22:00',
      isOpen: true,
    },
  });

  // Create Departments
  const departments = ['General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics'];

  const deptRecords = {};
  for (const dept of departments) {
    const d1 = await prisma.department.create({
      data: { name: dept, hospitalId: hospital1.id },
    });
    const d2 = await prisma.department.create({
      data: { name: dept, hospitalId: hospital2.id },
    });
    deptRecords[dept] = { h1: d1.id, h2: d2.id };
  }

  // Create Hospital Admins
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash,
      role: 'HOSPITAL_ADMIN',
    },
  });

  await prisma.staff.create({
    data: {
      userId: adminUser.id,
      hospitalId: hospital1.id,
      position: 'Hospital Administrator',
    },
  });

  // Create Doctors
  const doctorUsers = [
    { name: 'Dr. Arjun Sharma', email: 'doctor@demo.com', spec: 'Cardiology' },
    { name: 'Dr. Priya Roy', email: 'priya@demo.com', spec: 'Dermatology' },
    { name: 'Dr. Rahul Das', email: 'rahul@demo.com', spec: 'General Medicine' },
  ];

  const doctorRecords = [];
  for (const du of doctorUsers) {
    const user = await prisma.user.create({
      data: {
        name: du.name,
        email: du.email,
        passwordHash,
        role: 'DOCTOR',
      },
    });

    const doc = await prisma.doctor.create({
      data: {
        userId: user.id,
        hospitalId: hospital1.id,
        departmentId: deptRecords[du.spec]?.h1 || deptRecords['General Medicine'].h1,
        specialization: du.spec,
        qualification: 'MBBS, MD',
        experience: 12,
        licenseNumber: 'MED-' + Math.floor(Math.random() * 90000 + 10000),
        consultationFee: 500,
        workingDays: 'Mon,Tue,Wed,Thu,Fri',
        startTime: '09:00',
        endTime: '17:00',
        maxPatientsPerDay: 30,
        breakStart: '13:00',
        breakEnd: '14:00',
        status: 'ONLINE',
      },
    });
    doctorRecords.push(doc);
  }

  // Create Patients
  const patientUsers = [
    { name: 'Rahul Verma', email: 'patient@demo.com' },
    { name: 'Sneha Gupta', email: 'sneha@demo.com' },
    { name: 'Amit Patel', email: 'amit@demo.com' },
    { name: 'Deepa Nair', email: 'deepa@demo.com' },
    { name: 'Vikram Singh', email: 'vikram@demo.com' },
    { name: 'Meera Joshi', email: 'meera@demo.com' },
  ];

  const patientRecords = [];
  for (const pu of patientUsers) {
    const user = await prisma.user.create({
      data: {
        name: pu.name,
        email: pu.email,
        passwordHash,
        role: 'PATIENT',
      },
    });

    const pat = await prisma.patient.create({
      data: {
        userId: user.id,
        gender: 'Male',
        bloodGroup: 'O+',
      },
    });
    patientRecords.push(pat);
  }

  // Create today's queue and appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deptNameMap = {
    'Cardiology': 'CD',
    'Dermatology': 'DM',
    'General Medicine': 'GM',
    'Orthopedics': 'OR',
    'Pediatrics': 'PD',
  };

  // Create queue for Dr. Sharma (Cardiology)
  const queue = await prisma.queue.create({
    data: {
      doctorId: doctorRecords[0].id,
      hospitalId: hospital1.id,
      date: today,
      currentToken: 'CD-006',
      prefix: 'CD',
      totalServed: 5,
      totalWaiting: 4,
      isActive: true,
    },
  });

  // Create appointments for Dr. Sharma
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_CONSULTATION', 'CALLED', 'WAITING', 'BOOKED', 'BOOKED'];
  const times = ['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15'];

  for (let i = 0; i < 10; i++) {
    const patientIdx = i % patientRecords.length;
    await prisma.appointment.create({
      data: {
        patientId: patientRecords[patientIdx].id,
        doctorId: doctorRecords[0].id,
        hospitalId: hospital1.id,
        departmentId: deptRecords['Cardiology'].h1,
        date: today,
        slotTime: times[i],
        tokenNumber: `CD-${String(i + 1).padStart(3, '0')}`,
        status: statuses[i],
        queuePosition: i + 1,
        estimatedWait: Math.max(0, (i - 5) * 10),
      },
    });
  }

  // Create queue for Dr. Roy
  await prisma.queue.create({
    data: {
      doctorId: doctorRecords[1].id,
      hospitalId: hospital1.id,
      date: today,
      currentToken: 'DM-003',
      prefix: 'DM',
      totalServed: 2,
      totalWaiting: 3,
      isActive: true,
    },
  });

  const dmStatuses = ['COMPLETED', 'COMPLETED', 'IN_CONSULTATION', 'WAITING', 'BOOKED'];
  for (let i = 0; i < 5; i++) {
    await prisma.appointment.create({
      data: {
        patientId: patientRecords[i % patientRecords.length].id,
        doctorId: doctorRecords[1].id,
        hospitalId: hospital1.id,
        departmentId: deptRecords['Dermatology'].h1,
        date: today,
        slotTime: `09:${String(i * 15).padStart(2, '0')}`,
        tokenNumber: `DM-${String(i + 1).padStart(3, '0')}`,
        status: dmStatuses[i],
        queuePosition: i + 1,
        estimatedWait: Math.max(0, (i - 2) * 10),
      },
    });
  }

  // Create queue for Dr. Das
  await prisma.queue.create({
    data: {
      doctorId: doctorRecords[2].id,
      hospitalId: hospital1.id,
      date: today,
      currentToken: 'GM-002',
      prefix: 'GM',
      totalServed: 1,
      totalWaiting: 2,
      isActive: true,
    },
  });

  const gmStatuses = ['COMPLETED', 'CALLED', 'WAITING'];
  for (let i = 0; i < 3; i++) {
    await prisma.appointment.create({
      data: {
        patientId: patientRecords[i % patientRecords.length].id,
        doctorId: doctorRecords[2].id,
        hospitalId: hospital1.id,
        departmentId: deptRecords['General Medicine'].h1,
        date: today,
        slotTime: `09:${String(i * 15).padStart(2, '0')}`,
        tokenNumber: `GM-${String(i + 1).padStart(3, '0')}`,
        status: gmStatuses[i],
        queuePosition: i + 1,
        estimatedWait: Math.max(0, (i - 1) * 10),
      },
    });
  }

  // Create some notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: patientRecords[0].userId,
        title: 'Booking Confirmed',
        message: 'Your token CD-007 has been generated for Dr. Arjun Sharma',
        type: 'TOKEN_GENERATED',
      },
      {
        userId: patientRecords[5].userId,
        title: 'Your Turn is Approaching',
        message: 'Your turn is approaching! 1 patients ahead of you.',
        type: 'TURN_APPROACHING',
      },
    ],
  });

  console.log('Seed completed successfully!');
  console.log('');
  console.log('Demo Accounts:');
  console.log('  Patient:       patient@demo.com / demo123');
  console.log('  Doctor:        doctor@demo.com / demo123');
  console.log('  Hospital Admin: admin@demo.com / demo123');
  console.log('  Super Admin:   superadmin@demo.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
