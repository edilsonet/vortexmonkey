import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import {
  CreateStudentRecordDto,
  CreateTrainingCenterDto,
  CreateTrainingDocumentDto,
  EnrollStudentDto,
  GraduateStudentDto,
  RegisterFstdDeviceDto,
  RegisterInstructorDto,
  TransferStudentDto,
} from './training.dto';
import { TrainingService } from './training.service';

@Controller('api/v1')
export class TrainingController {
  public constructor(private readonly training: TrainingService) {}

  /** POST /api/v1/training-centers — Cadastra CIAC (RBAC 141) ou CTAC (RBAC 142). */
  @Post('training-centers')
  @RequireRoles('admin', 'supervisor')
  public registerTrainingCenter(@Req() req: Request, @Body() dto: CreateTrainingCenterDto): Promise<unknown> {
    return this.training.registerTrainingCenter(req.vortexContext!, dto);
  }

  /** GET /api/v1/training-centers — Lista centros. */
  @Get('training-centers')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listTrainingCenters(@Req() req: Request): Promise<unknown> {
    return this.training.listTrainingCenters(req.vortexContext!);
  }

  /** POST /api/v1/training-documents — Cadastra MIP/MGQ/MGSO/PRE. */
  @Post('training-documents')
  @RequireRoles('admin', 'supervisor')
  public createTrainingDocument(@Req() req: Request, @Body() dto: CreateTrainingDocumentDto): Promise<unknown> {
    return this.training.createTrainingDocument(req.vortexContext!, dto);
  }

  /** GET /api/v1/training-documents — Lista documentos. */
  @Get('training-documents')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listTrainingDocuments(@Req() req: Request): Promise<unknown> {
    return this.training.listTrainingDocuments(req.vortexContext!);
  }

  /** POST /api/v1/students — Matricula aluno (S141). */
  @Post('students')
  @RequireRoles('admin', 'supervisor', 'operator')
  public enrollStudent(@Req() req: Request, @Body() dto: EnrollStudentDto): Promise<unknown> {
    return this.training.enrollStudent(req.vortexContext!, dto);
  }

  /** GET /api/v1/students — Lista alunos (dobro do período → cancelamento automático). */
  @Get('students')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listStudents(@Req() req: Request): Promise<unknown> {
    return this.training.listStudents(req.vortexContext!);
  }

  /** POST /api/v1/students/:id/transfer — Transferência externa S141. */
  @Post('students/:id/transfer')
  @RequireRoles('admin', 'supervisor')
  public transferStudent(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferStudentDto,
  ): Promise<unknown> {
    return this.training.transferStudent(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/students/:id/graduate — Conclusão + certificado em até 10 dias. */
  @Post('students/:id/graduate')
  @RequireRoles('admin', 'supervisor')
  public graduateStudent(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GraduateStudentDto,
  ): Promise<unknown> {
    return this.training.graduateStudent(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/student-records — Registra ficha/avaliação. */
  @Post('student-records')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createStudentRecord(@Req() req: Request, @Body() dto: CreateStudentRecordDto): Promise<unknown> {
    return this.training.createStudentRecord(req.vortexContext!, dto);
  }

  /** GET /api/v1/student-records — Lista registros escolares. */
  @Get('student-records')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listStudentRecords(@Req() req: Request): Promise<unknown> {
    return this.training.listStudentRecords(req.vortexContext!);
  }

  /** POST /api/v1/fstd-devices — Cadastra dispositivo de simulação (RBAC 60). */
  @Post('fstd-devices')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerFstdDevice(@Req() req: Request, @Body() dto: RegisterFstdDeviceDto): Promise<unknown> {
    return this.training.registerFstdDevice(req.vortexContext!, dto);
  }

  /** GET /api/v1/fstd-devices — Lista dispositivos. */
  @Get('fstd-devices')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listFstdDevices(@Req() req: Request): Promise<unknown> {
    return this.training.listFstdDevices(req.vortexContext!);
  }

  /** POST /api/v1/instructors — Cadastra instrutor. */
  @Post('instructors')
  @RequireRoles('admin', 'supervisor')
  public registerInstructor(@Req() req: Request, @Body() dto: RegisterInstructorDto): Promise<unknown> {
    return this.training.registerInstructor(req.vortexContext!, dto);
  }

  /** GET /api/v1/instructors — Lista instrutores. */
  @Get('instructors')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listInstructors(@Req() req: Request): Promise<unknown> {
    return this.training.listInstructors(req.vortexContext!);
  }

  /** GET /api/v1/training/dashboard — KPIs do ERP 141/142. */
  @Get('training/dashboard')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getTrainingDashboard(@Req() req: Request): Promise<unknown> {
    return this.training.getTrainingDashboard(req.vortexContext!);
  }
}