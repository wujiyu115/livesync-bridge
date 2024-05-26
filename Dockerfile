FROM denoland/deno:latest

WORKDIR /app

VOLUME /app/dat
VOLUME /app/data

COPY . .

RUN deno cache main.ts

CMD [ "deno", "run", "-A", "main.ts" ]

