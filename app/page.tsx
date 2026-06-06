import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function IndexPage() {
  const user = await getSessionUser();
  
  if (user) {
    if (user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  } else {
    redirect('/login');
  }
}
