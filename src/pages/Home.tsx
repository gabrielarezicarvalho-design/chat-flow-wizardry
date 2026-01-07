import { useUserRole } from "@/hooks/useUserRole";
import Dashboard from "./Dashboard";
import AgentDashboard from "./AgentDashboard";
import { Loading } from "@/components/ui/loading";

const Home = () => {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  // Show AgentDashboard for agents, Dashboard for admins
  return isAdmin ? <Dashboard /> : <AgentDashboard />;
};

export default Home;
