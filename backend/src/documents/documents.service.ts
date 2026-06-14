import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private s3: S3Client;
  private bucket: string;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'eu-west-1'),
      endpoint: config.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      forcePathStyle: true,
    });
    this.bucket = config.get('S3_BUCKET', 'assurances-oued-zem');
  }

  async upload(
    file: Express.Multer.File,
    type: string,
    uploadedBy: string,
    metadata: { clientId?: string; contractId?: string; quoteId?: string; claimId?: string },
  ) {
    const key = `${type}/${uuidv4()}-${file.originalname}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { uploadedBy, ...metadata },
      }),
    );

    return this.prisma.document.create({
      data: {
        type,
        name: file.originalname,
        url: key,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy,
        ...metadata,
      },
    });
  }

  async findAll(params: { clientId?: string; contractId?: string; claimId?: string; type?: string }) {
    const where: any = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.contractId) where.contractId = params.contractId;
    if (params.claimId) where.claimId = params.claimId;
    if (params.type) where.type = params.type;

    return this.prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getDownloadUrl(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document non trouvé');

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: doc.url }),
      { expiresIn: 3600 },
    );

    return { url, name: doc.name };
  }

  async delete(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document non trouvé');

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.url }));
    return this.prisma.document.delete({ where: { id } });
  }
}
