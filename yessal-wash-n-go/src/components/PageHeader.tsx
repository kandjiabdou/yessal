
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const PageHeader = ({ title, description, showBackButton, action }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-1.5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => navigate(-1)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              <span className="sr-only">Retour</span>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {title}
            </h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && (
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
