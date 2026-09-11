import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hospitalId = searchParams.get('hospitalId');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {};
    if (hospitalId) where.hospitalId = hospitalId;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayData = await prisma.appointment.findMany({
        where: {
          ...where,
          date: { gte: d, lt: nextDay },
        },
      });

      last7Days.push({
        date: d.toISOString().split('T')[0],
        total: dayData.length,
        completed: dayData.filter((a) => a.status === 'COMPLETED').length,
        cancelled: dayData.filter((a) => a.status === 'CANCELLED').length,
        noShow: dayData.filter((a) => a.status === 'NO_SHOW').length,
      });
    }

    const todayAppointments = await prisma.appointment.findMany({
      where: {
        ...where,
        date: today,
      },
    });

    const hourlyDistribution: Record<string, number> = {};
    for (let h = 6; h <= 22; h++) {
      hourlyDistribution[`${String(h).padStart(2, '0')}:00`] = 0;
    }
    todayAppointments.forEach((apt) => {
      const hour = apt.slotTime.split(':')[0] + ':00';
      if (hourlyDistribution[hour] !== undefined) {
        hourlyDistribution[hour]++;
      }
    });

    const totalCompleted = todayAppointments.filter((a) => a.status === 'COMPLETED').length;
    const totalCancelled = todayAppointments.filter((a) => a.status === 'CANCELLED').length;
    const avgWait = todayAppointments.length > 0
      ? Math.round(todayAppointments.reduce((sum, a) => sum + (a.estimatedWait || 0), 0) / todayAppointments.length)
      : 0;

    return NextResponse.json({
      last7Days,
      hourlyDistribution: Object.entries(hourlyDistribution).map(([hour, count]) => ({ hour, count })),
      summary: {
        todayTotal: todayAppointments.length,
        todayCompleted: totalCompleted,
        todayCancelled: totalCancelled,
        avgWaitMinutes: avgWait,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
