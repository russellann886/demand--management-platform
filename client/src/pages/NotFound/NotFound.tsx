import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[60vh] place-items-center py-10">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <CardTitle>页面不存在</CardTitle>
          <CardDescription>
            链接可能已失效，或页面已经移动到其他位置。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
            返回上一页
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="size-4" />
              返回广场
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
