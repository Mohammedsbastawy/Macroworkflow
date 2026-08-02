# 1. مرحلة البناء (Build Stage)
FROM node:22-alpine AS builder
WORKDIR /app

# نسخ ملفات الحزم لتثبيت الاعتماديات
COPY package*.json ./
RUN npm install

# نسخ ملفات المشروع بالكامل وبناء التطبيق
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 2. مرحلة التشغيل (Runner Stage)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# نسخ الملفات المطلوبة للتشغيل من مرحلة البناء
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/emacro_db_check.js ./emacro_db_check.js

EXPOSE 3000
ENV PORT=3000

# بدء تشغيل التطبيق
CMD ["npm", "run", "start"]
