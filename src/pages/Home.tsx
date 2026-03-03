import { useUserRole } from "@/hooks/useUserRole";
import { Loading } from "@/components/ui/loading";
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./Dashboard"));
const AgentDashboard = lazy(() => import("./AgentDashboard"));

const Home = () => {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      {isAdmin ? <Dashboard /> : <AgentDashboard />}
    </Suspense>
  );
};

export default Home;
