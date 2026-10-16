import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const properties = await prisma.property.findMany({
    where: { userId: actor.userId },
    include: {
      rooms: true,
      assets: {
        include: {
          room: true,
          maintenanceRecords: { orderBy: { performedAt: "desc" } },
          documents: { select: { id: true, title: true } },
        },
      },
      meterReadings: {
        orderBy: { readingDate: "desc" },
        take: 30,
      },
    },
  });

  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.recordType) {
    return NextResponse.json(
      {
        error: "ValidationError",
        message:
          "Specify recordType: 'PROPERTY' | 'ROOM' | 'ASSET' | 'MAINTENANCE' | 'METER_READING'.",
      },
      { status: 400 }
    );
  }

  if (body.recordType === "PROPERTY") {
    const property = await prisma.property.create({
      data: {
        name: String(body.name || "Mein Zuhause"),
        address: body.address ? String(body.address) : null,
        propertyType: String(body.propertyType || "RENTAL"),
        areaSqm: typeof body.areaSqm === "number" ? body.areaSqm : null,
        landlordName: body.landlordName ? String(body.landlordName) : null,
        landlordContact: body.landlordContact
          ? String(body.landlordContact)
          : null,
        userId: actor.userId,
      },
    });
    await recordAuditEvent({
      actor,
      action: "PROPERTY_CREATED",
      entityType: "Property",
      entityId: property.id,
    });
    return NextResponse.json({ property }, { status: 201 });
  }

  if (body.recordType === "ROOM") {
    const room = await prisma.room.create({
      data: {
        name: String(body.name),
        floor: body.floor ? String(body.floor) : null,
        areaSqm: typeof body.areaSqm === "number" ? body.areaSqm : null,
        propertyId: String(body.propertyId),
      },
    });
    return NextResponse.json({ room }, { status: 201 });
  }

  if (body.recordType === "ASSET") {
    const asset = await prisma.householdAsset.create({
      data: {
        name: String(body.name),
        category: String(body.category || "APPLIANCE"),
        brand: body.brand ? String(body.brand) : null,
        modelNumber: body.modelNumber ? String(body.modelNumber) : null,
        serialNumber: body.serialNumber ? String(body.serialNumber) : null,
        purchaseDate: body.purchaseDate ? new Date(String(body.purchaseDate)) : null,
        purchasePriceCents:
          typeof body.purchasePriceCents === "number"
            ? body.purchasePriceCents
            : null,
        warrantyUntil: body.warrantyUntil
          ? new Date(String(body.warrantyUntil))
          : null,
        propertyId: String(body.propertyId),
        roomId: body.roomId ? String(body.roomId) : null,
      },
    });
    await recordAuditEvent({
      actor,
      action: "ASSET_CREATED",
      entityType: "HouseholdAsset",
      entityId: asset.id,
    });
    return NextResponse.json({ asset }, { status: 201 });
  }

  if (body.recordType === "METER_READING") {
    const reading = await prisma.meterReading.create({
      data: {
        meterType: body.meterType || "ELECTRICITY",
        meterNumber: body.meterNumber ? String(body.meterNumber) : null,
        readingValue: Number(body.readingValue),
        unit: String(body.unit || "kWh"),
        readingDate: new Date(String(body.readingDate || new Date().toISOString())),
        propertyId: String(body.propertyId),
      },
    });
    return NextResponse.json({ reading }, { status: 201 });
  }

  return NextResponse.json(
    { error: "UnsupportedRecordType" },
    { status: 400 }
  );
}
