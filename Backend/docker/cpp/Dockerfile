FROM gcc:13

RUN for h in bits/stdc++.h iostream; do       f=$(echo "#include <$h>" | g++ -std=c++17 -x c++ -H -E - 2>&1 >/dev/null | grep -m1 "/$h\$" | awk '{print $2}');       g++ -std=c++17 -x c++-header "$f" -o "$f.gch";     done

WORKDIR /app

CMD ["bash"]
