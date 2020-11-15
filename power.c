
#include  "myMath.h"

double Exponent(int x) {
    if (x == 0)
        return 1;
    if(x>0)
    {
        double ans = 1;
        for (int i = 1; i <= x; i++)
        {
            ans=ans*EXP;
        }
        return ans;
    }
    return 1/Exponent((-1*x));
}

double Power(double x , int y)
{
    if(x==0)
        return x;
    if(y==0)
        return 1;
    double ans=1;
    if(y>0)
    {
        for(int i=1;i<=y;i++)
        {
            ans=ans*x;
        }
        return ans;
    }
    return 1/Power(x,-y);

}

