FROM eclipse-temurin:21-jdk

RUN mkdir -p /tmp/cds && cd /tmp/cds  && printf 'public class Main{public static void main(String[] a){}}' > Main.java  && javac -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -J-XX:ArchiveClassesAtExit=/opt/javac.jsa Main.java  && rm -rf /tmp/cds

WORKDIR /app

CMD ["bash"]
