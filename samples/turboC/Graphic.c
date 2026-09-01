#include <graphics.h>
#include <conio.h>

int main()
{
    int driver = DETECT, gdriver;

    initgraph(&driver, &gdriver, "c:\\tc");

    setcolor(WHITE);
    settextstyle(1,0,3);
    outtextxy(10,10,"Hello, World. This is a graphic mode in Turbo C");

    getch();
    return 0;
}