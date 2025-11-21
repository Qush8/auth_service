import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from 'src/entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    action: string,
    outcome: string,
    ip?: string,
    userAgent?: string,
    metadata?: any,
  ): Promise<void> {
    try {
        const logEntry = this.auditLogRepository.create({
            userId,
            action,
            outcome,
            ip,
            userAgent,
            metadata,
        });
        await this.auditLogRepository.save(logEntry);
    } catch (e) {
        console.error('Failed to write audit log', e);
    }
  }
}

