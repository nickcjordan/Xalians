/* Exercise the unsupported instruction and verify unrelated faults still fail. */
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>

int main(int argc, char **argv)
{
    if (argc == 2 && strcmp(argv[1], "--trap") == 0)
        __builtin_trap();
    if (argc == 2 && strcmp(argv[1], "--signal") == 0)
        raise(SIGILL);
    uint64_t previous = 0;
    uint64_t cpu = 0;
    for (int i = 0; i < 1000; i++) {
        uint64_t low, high;
        __asm__ volatile("rdtscp" : "=a"(low), "=d"(high), "=c"(cpu) : : "memory");
        uint64_t ticks = (high << 32) | low;
        if ((low >> 32) || (high >> 32) || (cpu >> 32) || ticks <= previous)
            return 1;
        previous = ticks;
    }
    printf("1000 increasing timer reads, zero upper register bits; last CPU %llu\n", (unsigned long long)cpu);
    return 0;
}
