import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_codes_whatsapp')
export class OtpCodesWhatsappEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 6 })
  otpCode: string;

  @Column({ type: 'varchar' })
  waId: string;

  @Column({ type: 'varchar' })
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}
