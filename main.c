#include <stdio.h>
#include "myMath.h"
int main() 
{
    double x;
    double ans;
    printf("Please insert real number");
    scanf("%la",&x);
    if(x<0&&(x-(int)x)!= 0)//to round x down
    {
        x=x-1;
    }
    ans=Exponent((int)x);
    ans=add(ans,Power(x,3));
    ans=sub(ans,2); 
     printf("The value of f(x) = e^x +x^3 -2 at the point %.4lf is:%.4lf \n",x,ans);
     ans=mul(x,3);
     ans=add(ans,mul(Power(x,2),2));
     printf("The value of f(x) = 3x + 2X^2 at the point %.4lf is: %.4lf \n",x,ans); 
     ans=sub(div(mul(Power(x,3),4),5),mul(x,2));
     printf("The value of f(x) = (4x^3)/5-2x at the point %.4lf is: %.4lf \n",x,ans);
    return 0;
}
