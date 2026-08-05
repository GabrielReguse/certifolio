import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppShell } from './components/AppShell';
import { CourseFormModal } from './components/CourseFormModal';
import { EmptyState } from './components/EmptyState';
import { AppLoading } from './components/Loading';
import { Toast, type ToastData } from './components/Toast';
import { useSession } from './context/SessionContext';
import { useRouter } from './hooks/useRouter';
import { useTheme } from './hooks/useTheme';
import { CoursesPage } from './pages/CoursesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { GoalsPage } from './pages/GoalsPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { LandingPage } from './pages/LandingPage';
import { LegalPage } from './pages/LegalPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfileEditorPage } from './pages/ProfileEditorPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedCoursePage } from './pages/SharedCoursePage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import type { Course } from './types';

function safeDecodeSegment(value: string) {
  try { return decodeURIComponent(value); } catch { return ''; }
}

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return <AppLoading label="Redirecionando…"/>;
}

export default function App() {
  const { path } = useRouter();
  const session = useSession();
  const theme = useTheme();
  const [courseModal, setCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ id: Date.now(), message, type }), []);
  const openNew = useCallback(() => { setEditingCourse(null); setCourseModal(true); }, []);
  const openEdit = useCallback((course: Course) => { setEditingCourse(course); setCourseModal(true); }, []);
  const changed = useCallback(() => setRefreshKey((value) => value + 1), []);

  const publicUsername = path.startsWith('/u/') ? safeDecodeSegment(path.slice(3).split('/')[0]) : '';
  const sharedCourseId = path.startsWith('/c/') ? safeDecodeSegment(path.slice(3).split('/')[0]) : '';
  const publicPage = publicUsername ? <PublicProfilePage username={publicUsername}/> : sharedCourseId ? <SharedCoursePage courseId={sharedCourseId}/> : null;
  const authPage = useMemo(() => {
    if (path === '/entrar') return <LoginPage/>;
    if (path === '/criar-conta') return <SignupPage/>;
    if (path === '/esqueci-senha') return <ForgotPasswordPage/>;
    if (path === '/redefinir-senha') return <ResetPasswordPage/>;
    if (path === '/verificar-email') return <VerifyEmailPage/>;
    return null;
  }, [path]);

  if (publicPage) return publicPage;
  if (path === '/') return <LandingPage/>;
  if (path === '/privacidade') return <LegalPage kind="privacy"/>;
  if (path === '/termos') return <LegalPage kind="terms"/>;
  if (authPage) return session.user && !session.loading ? <Redirect to="/app"/> : authPage;
  if (!path.startsWith('/app')) return <NotFoundPage/>;
  if (session.loading) return <AppLoading label="Verificando sua sessão…"/>;
  if (!session.user) return <Redirect to={`/entrar?redirect=${encodeURIComponent(path)}`}/>;
  if (session.profileLoading) return <AppLoading label="Organizando seu perfil…"/>;
  if (session.profileError) return <main className="app-loading"><EmptyState icon="info" title="Não foi possível carregar seu perfil" text={session.profileError} action={<button className="button button--primary" onClick={() => void session.refresh()}>Tentar novamente</button>}/></main>;
  if (!session.profile) return <AppLoading label="Organizando seu perfil…"/>;
  if (!session.profile.onboardingCompleted) return <OnboardingPage/>;

  let title = 'Visão geral'; let subtitle = 'Acompanhe tudo o que você já aprendeu.'; let content: ReactNode;
  if (path === '/app') content = <DashboardPage onNewCourse={openNew} refreshKey={refreshKey}/>;
  else if (path === '/app/cursos') { title = 'Seus cursos'; subtitle = 'Pesquise, edite e publique suas certificações.'; content = <CoursesPage refreshKey={refreshKey} onNewCourse={openNew} onEdit={openEdit} notify={notify} onChanged={changed}/>; }
  else if (path === '/app/metas') { title = 'Metas'; subtitle = 'Crie objetivos e fixe um deles no dashboard.'; content = <GoalsPage refreshKey={refreshKey} notify={notify} onChanged={changed}/>; }
  else if (path === '/app/instituicoes') { title = 'Instituições'; subtitle = 'Pastas criadas automaticamente a partir dos seus cursos.'; content = <InstitutionsPage refreshKey={refreshKey} onEdit={openEdit}/>; }
  else if (path === '/app/perfil') { title = 'Perfil público'; subtitle = 'Controle como sua trajetória aparece para outras pessoas.'; content = <ProfileEditorPage notify={notify}/>; }
  else if (path === '/app/configuracoes') { title = 'Configurações'; subtitle = 'Aparência, conta e segurança.'; content = <SettingsPage {...theme} notify={notify}/>; }
  else if (path === '/app/lixeira') { title = 'Lixeira'; subtitle = 'Cursos excluídos podem ser restaurados.'; content = <CoursesPage deleted refreshKey={refreshKey} onNewCourse={openNew} onEdit={openEdit} notify={notify} onChanged={changed}/>; }
  else return <NotFoundPage/>;

  return <>
    <AppShell title={title} subtitle={subtitle} onNewCourse={openNew}>{content}</AppShell>
    <CourseFormModal open={courseModal} course={editingCourse} onClose={() => setCourseModal(false)} onSaved={() => changed()} notify={notify}/>
    {toast && <Toast key={toast.id} toast={toast} onClose={() => setToast(null)}/>} 
  </>;
}
