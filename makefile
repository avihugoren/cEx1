# main: main.o basicMath.o power.o
# 	gcc main.o basicMath.o power.o -o main

# main.o: main.c myMath.h
# 	gcc -c main.c -o main.o

# basicMath.o:basicMath.c myMath.h
# 	gcc -c basicMath.c -o basicMath.o

# power.o: power.c myMath.h
# 	gcc -c power.c -o power.o

# clean:
# 	rm main *.o
FLAGS= -Wall -g
all: libmyMath.so libmyMath.a mains maind 
mains:main.o libmyMath.a
	gcc $(FLAGS) -o mains main.o libmyMath.a

maind:main.o libmyMath.so
	gcc $(FLAGS) -o maind main.o ./libmyMath.so

mymathd: libmyMath.so
mymaths: libmyMath.a

libmyMath.so: basicMath.o power.o
	gcc -shared -o libmyMath.so basicMath.o power.o

libmyMath.a:basicMath.o power.o
	ar -rcs libmyMath.a basicMath.o power.o

main.o: main.c myMath.h
	gcc $(FLAGS) -c main.c -o main.o

basicMath.o:basicMath.c myMath.h
	gcc $(FLAGS) -c basicMath.c -o basicMath.o

power.o: power.c myMath.h
	gcc $(FLAGS) -c power.c -o power.o

.PHONY: clean all
clean:
	rm -f *.o *.a *.so mains maind

