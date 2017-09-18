/* BASED ON BioLite memusage.c, see (C) below.
 * 
 * quick and dirty compile instructions:
 *  gcc -c -fPIC mymemusage.c -o mymemusage.o && \
 *  gcc -shared -Wl,-soname,libmymemusage.so -o libmymemusage.so mymemusage.o
 *
 *
 * BioLite - Tools for processing gene sequence data and automating workflows
 * Copyright (c) 2012 Brown University. All rights reserved.
 *
 * This file is part of BioLite.
 *
 * BioLite is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BioLite is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BioLite.  If not, see <http://www.gnu.org/licenses/>.
 */

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

__attribute__ ((destructor))
void memusage()
{
    char line[128];

    /* Report memory usage from /proc/self/status interface. */
    FILE* status = fopen("/proc/self/status", "r");
    if (!status)
    {
        dprintf(4,"[mymemusage] error: unable to open /proc/self/status\n");
        return;
    }

    long long unsigned VmHWM = 0;
    while (!feof(status)) {
        fgets(line, 128, status);
        if (strncmp(line, "VmHWM:", 6) == 0)
        {
            int n = sscanf(line, "VmHWM: ""%llu", &VmHWM);
            if (n != 1) {
                dprintf(4,"[mymemusage] error: could not parse VmHWM\n");
            }
            break;
        }
    }
    fclose(status);

    dprintf(4,"[mymemusage] %llu\n",VmHWM);
    fflush(stderr);
}