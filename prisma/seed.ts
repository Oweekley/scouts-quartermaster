import {
  DayOfWeek,
  EquipmentCondition,
  EquipmentStatus,
  MaintenancePriority,
  Prisma,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertLocation(data: { parentId: string | null; name: string; notes?: string | null }) {
  const existing = await prisma.location.findFirst({
    where: { parentId: data.parentId, name: data.name },
  });
  if (existing) {
    return prisma.location.update({
      where: { id: existing.id },
      data: { notes: data.notes },
    });
  }
  return prisma.location.create({
    data: { parentId: data.parentId, name: data.name, notes: data.notes },
  });
}

async function upsertCategory(data: {
  parentId: string | null;
  name: string;
  description?: string;
}) {
  const existing = await prisma.equipmentCategory.findFirst({
    where: { parentId: data.parentId, name: data.name },
  });
  if (existing) {
    return prisma.equipmentCategory.update({
      where: { id: existing.id },
      data: { description: data.description },
    });
  }
  return prisma.equipmentCategory.create({
    data: { parentId: data.parentId, name: data.name, description: data.description },
  });
}

function d(date: string) {
  // date: YYYY-MM-DD
  return new Date(`${date}T00:00:00.000Z`);
}

async function main() {
  const seedPassword = process.env.SEED_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const [admin, qm, leader] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@scouts.local" },
      update: { name: "Admin", role: Role.ADMIN, passwordHash, isActive: true },
      create: { email: "admin@scouts.local", name: "Admin", role: Role.ADMIN, passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "qm@scouts.local" },
      update: {
        name: "Quartermaster",
        role: Role.QUARTERMASTER,
        passwordHash,
        isActive: true,
      },
      create: {
        email: "qm@scouts.local",
        name: "Quartermaster",
        role: Role.QUARTERMASTER,
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "leader@scouts.local" },
      update: { name: "Leader", role: Role.LEADER, passwordHash, isActive: true },
      create: { email: "leader@scouts.local", name: "Leader", role: Role.LEADER, passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "readonly@scouts.local" },
      update: { name: "Read-only", role: Role.READONLY, passwordHash, isActive: true },
      create: {
        email: "readonly@scouts.local",
        name: "Read-only",
        role: Role.READONLY,
        passwordHash,
      },
    }),
  ]);

  // Locations: ONLY the cupboards/shelves you listed (so `/locations` stays clean).
  const hallCupboard = await upsertLocation({
    parentId: null,
    name: "Hall cupboard",
    notes: "Hall cupboard storage.",
  });
  const hallCupboardLeft = await upsertLocation({
    parentId: hallCupboard.id,
    name: "Left",
    notes: null,
  });
  const hallCupboardMiddle = await upsertLocation({
    parentId: hallCupboard.id,
    name: "Middle",
    notes: null,
  });
  const hallCupboardRight = await upsertLocation({
    parentId: hallCupboard.id,
    name: "Right",
    notes: null,
  });

  const craftCupboard = await upsertLocation({
    parentId: null,
    name: "Craft cupboard",
    notes: "Craft cupboard storage.",
  });
  const craftCupboardLeft = await upsertLocation({
    parentId: craftCupboard.id,
    name: "Left",
    notes: null,
  });
  const craftCupboardRight = await upsertLocation({
    parentId: craftCupboard.id,
    name: "Right",
    notes: null,
  });

  const upstairsShelves = await upsertLocation({
    parentId: null,
    name: "Upstairs shelves",
    notes: "Upstairs shelves storage.",
  });
  const upstairsShelf1 = await upsertLocation({
    parentId: upstairsShelves.id,
    name: "Shelf 1",
    notes: null,
  });
  const upstairsShelf2 = await upsertLocation({
    parentId: upstairsShelves.id,
    name: "Shelf 2",
    notes: null,
  });
  const upstairsShelf3 = await upsertLocation({
    parentId: upstairsShelves.id,
    name: "Shelf 3",
    notes: null,
  });
  const upstairsShelf4 = await upsertLocation({
    parentId: upstairsShelves.id,
    name: "Shelf 4",
    notes: null,
  });

  const upstairsMetalCupboard = await upsertLocation({
    parentId: null,
    name: "Upstairs metal cupboard",
    notes: "Upstairs metal cupboard storage.",
  });
  const upstairsMetalLeft = await upsertLocation({
    parentId: upstairsMetalCupboard.id,
    name: "Left",
    notes: null,
  });
  const upstairsMetalRight = await upsertLocation({
    parentId: upstairsMetalCupboard.id,
    name: "Right",
    notes: null,
  });

  const attic = await upsertLocation({
    parentId: null,
    name: "Attic",
    notes: "Attic storage.",
  });

  // Aliases so the rest of the seed keeps working without creating extra locations.
  const tentRack = upstairsShelf4;
  const patrolBoxRack = upstairsShelf2;
  const ropeBin = upstairsShelf1;
  const toolArea = upstairsMetalRight;
  const kitchenShelf1 = upstairsShelf2;
  const kitchenShelf2 = upstairsShelf2;
  const hallStore = hallCupboardRight;
  const campCupboard = hallCupboardMiddle;
  const firstAidDrawer = hallCupboardMiddle;
  const containerA = upstairsMetalRight;

  const camping = await upsertCategory({
    parentId: null,
    name: "Camping",
    description: "Tents, tarps, sleeping kit and camp infrastructure.",
  });
  const firstAid = await upsertCategory({
    parentId: null,
    name: "First aid",
    description: "First aid kits and medical supplies.",
  });
  const tools = await upsertCategory({
    parentId: null,
    name: "Tools",
    description: "Axes, saws and maintenance tools.",
  });
  const cooking = await upsertCategory({
    parentId: null,
    name: "Cooking",
    description: "Stoves, fuel, patrol boxes and catering kit.",
  });
  const lighting = await upsertCategory({
    parentId: null,
    name: "Lighting",
    description: "Lanterns, headtorches and power.",
  });
  const water = await upsertCategory({
    parentId: null,
    name: "Water & hygiene",
    description: "Water containers, wash-up, hygiene and cleaning kit.",
  });
  const navigation = await upsertCategory({
    parentId: null,
    name: "Navigation",
    description: "Maps, compasses and navigation training kit.",
  });
  const pioneering = await upsertCategory({
    parentId: null,
    name: "Pioneering",
    description: "Lashing, poles and pioneering equipment.",
  });
  const activities = await upsertCategory({
    parentId: null,
    name: "Activities & games",
    description: "Games, sports and activity kit for meetings and camps.",
  });
  const adminKit = await upsertCategory({
    parentId: null,
    name: "Admin & paperwork",
    description: "Documents, folders, printouts, badges and admin supplies.",
  });
  const comms = await upsertCategory({
    parentId: null,
    name: "Comms & safety",
    description: "Radios, signage, hi-vis and car park / event comms kit.",
  });
  const consumables = await upsertCategory({
    parentId: null,
    name: "Consumables",
    description: "Tape, bin bags, stationery, batteries and camp consumables.",
  });

  // Subcategories (kept lightweight for MVP; expand as needed)
  const campingTents = await upsertCategory({
    parentId: camping.id,
    name: "Tents",
    description: "Tents and tent parts.",
  });
  const campingShelter = await upsertCategory({
    parentId: camping.id,
    name: "Shelter",
    description: "Tarps, gazebos and shelters.",
  });
  const campingSleep = await upsertCategory({
    parentId: camping.id,
    name: "Sleep kit",
    description: "Mats, bags and camp beds.",
  });
  const cookingStoves = await upsertCategory({
    parentId: cooking.id,
    name: "Stoves & fuel",
    description: "Stoves, fuel and safety kit.",
  });
  const cookingPots = await upsertCategory({
    parentId: cooking.id,
    name: "Pots & pans",
    description: "Pots, pans and kettles.",
  });
  const cookingUtensils = await upsertCategory({
    parentId: cooking.id,
    name: "Utensils",
    description: "Cooking tools and serving kit.",
  });
  const toolsCutting = await upsertCategory({
    parentId: tools.id,
    name: "Cutting tools",
    description: "Axes, saws and knives.",
  });
  const toolsGeneral = await upsertCategory({
    parentId: tools.id,
    name: "General tools",
    description: "Hammers, mallets, spades and general kit.",
  });
  const activitiesSports = await upsertCategory({
    parentId: activities.id,
    name: "Sports & team games",
    description: "Football, balls and outdoor games.",
  });
  const activitiesWideGames = await upsertCategory({
    parentId: activities.id,
    name: "Wide games",
    description: "Wide game props, markers and activity kits.",
  });
  const activitiesTarget = await upsertCategory({
    parentId: activities.id,
    name: "Target sports",
    description: "Soft archery, tomahawks and target activities.",
  });
  const adminDocs = await upsertCategory({
    parentId: adminKit.id,
    name: "Documents",
    description: "Printouts, folders and paperwork packs.",
  });
  const adminBadges = await upsertCategory({
    parentId: adminKit.id,
    name: "Badges & awards",
    description: "Blanket badges and award stock.",
  });
  const adminProgramme = await upsertCategory({
    parentId: adminKit.id,
    name: "Programme resources",
    description: "Activity sheets, trail papers and programme resources.",
  });
  const commsRadios = await upsertCategory({
    parentId: comms.id,
    name: "Radios",
    description: "Two-way radios and accessories.",
  });
  const commsEvent = await upsertCategory({
    parentId: comms.id,
    name: "Event kit",
    description: "Hi-vis, signage and event comms.",
  });
  const consumablesTape = await upsertCategory({
    parentId: consumables.id,
    name: "Tape & repairs",
    description: "Duct tape and quick repairs.",
  });
  const consumablesStationery = await upsertCategory({
    parentId: consumables.id,
    name: "Stationery",
    description: "Paper, pens, crayons and printing supplies.",
  });
  const consumablesBags = await upsertCategory({
    parentId: consumables.id,
    name: "Bags & cleaning",
    description: "Bin bags and camp cleaning consumables.",
  });
  const consumablesPower = await upsertCategory({
    parentId: consumables.id,
    name: "Power & charging",
    description: "Batteries, chargers, power banks and cables.",
  });

  const [tentType, firstAidKitType, axeType, cookingKitType] = await Promise.all([
    prisma.equipmentType.upsert({
      where: { name: "Tent" },
      update: {},
      create: { name: "Tent", description: "Sleeping shelters (patrol tents, lightweight tents, etc.)." },
    }),
    prisma.equipmentType.upsert({
      where: { name: "First aid kit" },
      update: {},
      create: { name: "First aid kit", description: "First aid kit boxes/bags with check schedules." },
    }),
    prisma.equipmentType.upsert({
      where: { name: "Axe / tool" },
      update: {},
      create: { name: "Axe / tool", description: "Axes, saws and edged tools requiring safety management." },
    }),
    prisma.equipmentType.upsert({
      where: { name: "Cooking kit" },
      update: {},
      create: { name: "Cooking kit", description: "Cooking equipment, stoves and patrol boxes." },
    }),
  ]);

  await prisma.customFieldDefinition.createMany({
    data: [
      { equipmentTypeId: tentType.id, key: "sleeps", label: "Sleeps", fieldType: "NUMBER", required: false, sortOrder: 1 },
      { equipmentTypeId: tentType.id, key: "poles_count", label: "Poles count", fieldType: "NUMBER", required: false, sortOrder: 2 },
      { equipmentTypeId: tentType.id, key: "footprint", label: "Footprint", fieldType: "TEXT", required: false, sortOrder: 3 },
      { equipmentTypeId: tentType.id, key: "flysheet_notes", label: "Flysheet notes", fieldType: "TEXTAREA", required: false, sortOrder: 4 },

      { equipmentTypeId: firstAidKitType.id, key: "next_check_due", label: "Next check due", fieldType: "DATE", required: false, sortOrder: 1 },
      { equipmentTypeId: firstAidKitType.id, key: "consumables_notes", label: "Consumables notes", fieldType: "TEXTAREA", required: false, sortOrder: 2 },

      { equipmentTypeId: axeType.id, key: "sharpening_due", label: "Sharpening due", fieldType: "DATE", required: false, sortOrder: 1 },
      { equipmentTypeId: axeType.id, key: "safety_notes", label: "Safety notes", fieldType: "TEXTAREA", required: false, sortOrder: 2 },

      { equipmentTypeId: cookingKitType.id, key: "fuel_type", label: "Fuel type", fieldType: "SELECT", required: false, sortOrder: 1, options: ["Gas", "Meths", "Solid fuel", "Wood"] },
      { equipmentTypeId: cookingKitType.id, key: "cleaning_notes", label: "Cleaning notes", fieldType: "TEXTAREA", required: false, sortOrder: 2 },
    ],
    skipDuplicates: true,
  });

  // A bunch of realistic kit to make the app feel “real” immediately.
  // Seed strategy:
  // - createMany with skipDuplicates so re-running seed doesn't overwrite user edits
  // - a few "demo" items still get explicit upserts/flows below
  const bulkEquipment: Prisma.EquipmentCreateManyInput[] = [
    // Tents & shelter
    {
      name: "Patrol tent (4-person)",
      assetId: "TENT-001",
      qrValue: "scouts:TENT-001",
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      notes: "Stored with poles and pegs. Count pegs on return.",
      locationId: tentRack.id,
      purchaseDate: d("2021-04-10"),
      value: new Prisma.Decimal("260.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    },
    {
      name: "Patrol tent (4-person)",
      assetId: "TENT-002",
      qrValue: "scouts:TENT-002",
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      locationId: tentRack.id,
      purchaseDate: d("2021-04-10"),
      value: new Prisma.Decimal("260.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    },
    {
      name: "Patrol tent (4-person)",
      assetId: "TENT-003",
      qrValue: "scouts:TENT-003",
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.FAIR,
      notes: "Small patch on inner door. Keep an eye on zip.",
      locationId: tentRack.id,
      purchaseDate: d("2018-06-01"),
      value: new Prisma.Decimal("240.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    },
    {
      name: "Lightweight tent (2-person)",
      assetId: "TENT-004",
      qrValue: "scouts:TENT-004",
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.EXCELLENT,
      notes: "For lightweight camps. Dry fully before storage.",
      locationId: tentRack.id,
      purchaseDate: d("2023-03-12"),
      value: new Prisma.Decimal("180.00"),
      createdById: admin.id,
      updatedById: admin.id,
      isActive: true,
    },
    {
      name: "Tarp (3x3m)",
      assetId: "TARP-001",
      qrValue: "scouts:TARP-001",
      categoryId: campingShelter.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      notes: "With 4 guylines + pegs (bagged).",
      locationId: tentRack.id,
      purchaseDate: d("2020-08-22"),
      value: new Prisma.Decimal("35.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    },
    { name: "Tarp (3x3m)", assetId: "TARP-002", qrValue: "scouts:TARP-002", categoryId: campingShelter.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: tentRack.id, purchaseDate: d("2020-08-22"), value: new Prisma.Decimal("35.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Tarp (4x4m)", assetId: "TARP-003", qrValue: "scouts:TARP-003", categoryId: campingShelter.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.FAIR, notes: "Grommet on one corner is stiff; use extra loop.", locationId: tentRack.id, purchaseDate: d("2017-05-15"), value: new Prisma.Decimal("45.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Gazebo (3x3m)", assetId: "GAZ-001", qrValue: "scouts:GAZ-001", categoryId: campingShelter.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, notes: "Includes side panels in bag.", locationId: attic.id, purchaseDate: d("2019-07-01"), value: new Prisma.Decimal("120.00"), createdById: admin.id, updatedById: admin.id, isActive: true },
    { name: "Groundsheet (large)", assetId: "GSH-001", qrValue: "scouts:GSH-001", categoryId: campingShelter.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: tentRack.id, purchaseDate: d("2022-02-14"), value: new Prisma.Decimal("28.00"), createdById: qm.id, updatedById: qm.id, isActive: true },

    // Sleep kit
    { name: "Sleeping mat (foam)", assetId: "MAT-001", qrValue: "scouts:MAT-001", categoryId: campingSleep.id, quantity: 12, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, notes: "Count and wipe down after camps.", locationId: hallStore.id, purchaseDate: d("2020-09-01"), value: new Prisma.Decimal("10.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Sleeping mat (foam)", assetId: "MAT-002", qrValue: "scouts:MAT-002", categoryId: campingSleep.id, quantity: 12, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: hallStore.id, purchaseDate: d("2020-09-01"), value: new Prisma.Decimal("10.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Sleeping bag (3-season)", assetId: "SBAG-001", qrValue: "scouts:SBAG-001", categoryId: campingSleep.id, quantity: 8, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, notes: "Dry fully. Store uncompressed.", locationId: hallStore.id, purchaseDate: d("2018-11-20"), value: new Prisma.Decimal("35.00"), createdById: admin.id, updatedById: admin.id, isActive: true },
    { name: "Camp bed", assetId: "BED-001", qrValue: "scouts:BED-001", categoryId: campingSleep.id, quantity: 6, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.FAIR, notes: "One bed has slightly bent leg—check before use.", locationId: hallStore.id, purchaseDate: d("2016-04-05"), value: new Prisma.Decimal("22.00"), createdById: qm.id, updatedById: qm.id, isActive: true },

    // First aid
    { name: "First aid kit (main)", assetId: "FAK-001", qrValue: "scouts:FAK-001", categoryId: firstAid.id, typeId: firstAidKitType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.EXCELLENT, locationId: firstAidDrawer.id, purchaseDate: d("2022-01-10"), value: new Prisma.Decimal("65.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "First aid kit (camp)", assetId: "FAK-002", qrValue: "scouts:FAK-002", categoryId: firstAid.id, typeId: firstAidKitType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, notes: "Compact kit for day hikes.", locationId: firstAidDrawer.id, purchaseDate: d("2021-05-04"), value: new Prisma.Decimal("35.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Emergency blanket pack", assetId: "FA-EB-001", qrValue: "scouts:FA-EB-001", categoryId: firstAid.id, quantity: 10, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, notes: "Consumable. Replace as used.", locationId: firstAidDrawer.id, purchaseDate: d("2023-09-02"), value: new Prisma.Decimal("12.00"), createdById: leader.id, updatedById: leader.id, isActive: true },

    // Tools
    { name: "Axe (splitting)", assetId: "AXE-001", qrValue: "scouts:AXE-001", categoryId: toolsCutting.id, typeId: axeType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: toolArea.id, notes: "Keep in tool box. Use gloves.", purchaseDate: d("2017-09-12"), value: new Prisma.Decimal("45.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Hatchet", assetId: "AXE-002", qrValue: "scouts:AXE-002", categoryId: toolsCutting.id, typeId: axeType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: toolArea.id, notes: "Use with chopping block.", purchaseDate: d("2019-05-10"), value: new Prisma.Decimal("30.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Bow saw", assetId: "SAW-001", qrValue: "scouts:SAW-001", categoryId: toolsCutting.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: toolArea.id, notes: "Check blade tension.", purchaseDate: d("2020-03-18"), value: new Prisma.Decimal("18.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Mallet", assetId: "MAL-001", qrValue: "scouts:MAL-001", categoryId: toolsGeneral.id, quantity: 4, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: toolArea.id, purchaseDate: d("2021-06-02"), value: new Prisma.Decimal("9.00"), createdById: leader.id, updatedById: leader.id, isActive: true },
    { name: "Tool box (general)", assetId: "TBX-001", qrValue: "scouts:TBX-001", categoryId: toolsGeneral.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: toolArea.id, notes: "Spanners, screwdrivers, duct tape, spare pegs.", purchaseDate: d("2018-02-01"), value: new Prisma.Decimal("55.00"), createdById: qm.id, updatedById: qm.id, isActive: true },

    // Cooking kit
    { name: "Patrol box (Foxes)", assetId: "PBX-FOX", qrValue: "scouts:PBX-FOX", categoryId: cooking.id, typeId: cookingKitType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: patrolBoxRack.id, notes: "Complete patrol cooking box. Check inventory sheet.", purchaseDate: d("2019-04-01"), value: new Prisma.Decimal("240.00"), createdById: admin.id, updatedById: admin.id, isActive: true },
    { name: "Patrol box (Owls)", assetId: "PBX-OWL", qrValue: "scouts:PBX-OWL", categoryId: cooking.id, typeId: cookingKitType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: patrolBoxRack.id, notes: "Complete patrol cooking box. Check inventory sheet.", purchaseDate: d("2019-04-01"), value: new Prisma.Decimal("240.00"), createdById: admin.id, updatedById: admin.id, isActive: true },
    { name: "Gas stove (double burner)", assetId: "STV-001", qrValue: "scouts:STV-001", categoryId: cookingStoves.id, typeId: cookingKitType.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: kitchenShelf1.id, notes: "Use with gas canisters. Keep windshields.", purchaseDate: d("2022-06-10"), value: new Prisma.Decimal("58.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Trangia set", assetId: "TRG-001", qrValue: "scouts:TRG-001", categoryId: cookingStoves.id, typeId: cookingKitType.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: kitchenShelf1.id, notes: "Meths burners + windshields.", purchaseDate: d("2018-08-01"), value: new Prisma.Decimal("65.00"), createdById: leader.id, updatedById: leader.id, isActive: true },
    { name: "Billy can (large)", assetId: "POT-001", qrValue: "scouts:POT-001", categoryId: cookingPots.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: kitchenShelf2.id, purchaseDate: d("2017-09-01"), value: new Prisma.Decimal("22.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Kettle", assetId: "KET-001", qrValue: "scouts:KET-001", categoryId: cookingPots.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: kitchenShelf2.id, purchaseDate: d("2020-04-12"), value: new Prisma.Decimal("16.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Cooking utensils set", assetId: "UTL-001", qrValue: "scouts:UTL-001", categoryId: cookingUtensils.id, quantity: 1, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: kitchenShelf2.id, notes: "Spatulas, ladle, tongs, chopping boards.", purchaseDate: d("2021-02-18"), value: new Prisma.Decimal("30.00"), createdById: leader.id, updatedById: leader.id, isActive: true },

    // Water & hygiene
    { name: "Water carrier (10L)", assetId: "WAT-001", qrValue: "scouts:WAT-001", categoryId: water.id, quantity: 4, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: hallStore.id, notes: "Rinse and dry. No boiling water.", purchaseDate: d("2020-06-01"), value: new Prisma.Decimal("12.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Wash-up bowl set", assetId: "WASH-001", qrValue: "scouts:WASH-001", categoryId: water.id, quantity: 2, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: hallStore.id, notes: "Two bowls + drying rack.", purchaseDate: d("2019-03-10"), value: new Prisma.Decimal("18.00"), createdById: leader.id, updatedById: leader.id, isActive: true },

    // Lighting & power
    { name: "LED lantern", assetId: "LAN-001", qrValue: "scouts:LAN-001", categoryId: lighting.id, quantity: 6, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: campCupboard.id, notes: "Check batteries before camp.", purchaseDate: d("2021-10-01"), value: new Prisma.Decimal("14.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Headtorch", assetId: "HT-001", qrValue: "scouts:HT-001", categoryId: lighting.id, quantity: 10, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: campCupboard.id, purchaseDate: d("2022-02-12"), value: new Prisma.Decimal("9.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Spare batteries (AA)", assetId: "BAT-AA", qrValue: "scouts:BAT-AA", categoryId: lighting.id, quantity: 48, isConsumable: true, minStock: 12, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: campCupboard.id, notes: "Consumable. Keep topped up.", purchaseDate: d("2024-01-05"), value: new Prisma.Decimal("20.00"), createdById: leader.id, updatedById: leader.id, isActive: true },

    // Navigation
    { name: "Map set (local OS)", assetId: "MAP-001", qrValue: "scouts:MAP-001", categoryId: navigation.id, quantity: 6, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: campCupboard.id, notes: "Keep dry. Replace if torn.", purchaseDate: d("2021-03-01"), value: new Prisma.Decimal("60.00"), createdById: admin.id, updatedById: admin.id, isActive: true },
    { name: "Compass (baseplate)", assetId: "COMP-001", qrValue: "scouts:COMP-001", categoryId: navigation.id, quantity: 12, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: campCupboard.id, purchaseDate: d("2020-02-02"), value: new Prisma.Decimal("72.00"), createdById: qm.id, updatedById: qm.id, isActive: true },

    // Pioneering
    { name: "Lashing rope (10m)", assetId: "LASH-10", qrValue: "scouts:LASH-10", categoryId: pioneering.id, quantity: 20, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: ropeBin.id, notes: "For pioneering. Count and dry after use.", purchaseDate: d("2019-09-01"), value: new Prisma.Decimal("50.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
    { name: "Lashing rope (5m)", assetId: "LASH-05", qrValue: "scouts:LASH-05", categoryId: pioneering.id, quantity: 20, status: EquipmentStatus.AVAILABLE, condition: EquipmentCondition.GOOD, locationId: ropeBin.id, purchaseDate: d("2019-09-01"), value: new Prisma.Decimal("35.00"), createdById: qm.id, updatedById: qm.id, isActive: true },
  ];

  const defaults = {
    createdById: qm.id,
    updatedById: qm.id,
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.GOOD,
    isActive: true,
  } satisfies Partial<Prisma.EquipmentCreateManyInput>;

  function add(input: Omit<Prisma.EquipmentCreateManyInput, "qrValue"> & { qrValue?: string }) {
    const qrValue = input.qrValue ?? `scouts:${input.assetId}`;
    bulkEquipment.push({ ...defaults, ...input, qrValue });
  }

  // Add lots more “single record” items programmatically for a fuller inventory
  for (let i = 5; i <= 14; i++) {
    bulkEquipment.push({
      name: `Lightweight tent (2-person)`,
      assetId: `TENT-${String(i).padStart(3, "0")}`,
      qrValue: `scouts:TENT-${String(i).padStart(3, "0")}`,
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: i % 4 === 0 ? EquipmentCondition.FAIR : EquipmentCondition.GOOD,
      notes: i % 4 === 0 ? "Check flysheet seam tape." : undefined,
      locationId: tentRack.id,
      purchaseDate: d("2022-05-01"),
      value: new Prisma.Decimal("170.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    });
  }
  for (let i = 4; i <= 10; i++) {
    bulkEquipment.push({
      name: "Tarp (3x3m)",
      assetId: `TARP-${String(i).padStart(3, "0")}`,
      qrValue: `scouts:TARP-${String(i).padStart(3, "0")}`,
      categoryId: campingShelter.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      locationId: tentRack.id,
      purchaseDate: d("2021-07-15"),
      value: new Prisma.Decimal("35.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    });
  }
  for (let i = 1; i <= 8; i++) {
    bulkEquipment.push({
      name: "Pegs set",
      assetId: `PEG-${String(i).padStart(3, "0")}`,
      qrValue: `scouts:PEG-${String(i).padStart(3, "0")}`,
      categoryId: campingShelter.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      notes: "Approx 20 mixed pegs + bag.",
      locationId: toolArea.id,
      purchaseDate: d("2020-04-20"),
      value: new Prisma.Decimal("8.00"),
      createdById: leader.id,
      updatedById: leader.id,
      isActive: true,
    });
  }
  for (let i = 1; i <= 6; i++) {
    bulkEquipment.push({
      name: "Gas canister (butane/propane mix)",
      assetId: `GAS-${String(i).padStart(3, "0")}`,
      qrValue: `scouts:GAS-${String(i).padStart(3, "0")}`,
      categoryId: cookingStoves.id,
      typeId: cookingKitType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      notes: "Consumable. Track remaining stock.",
      locationId: kitchenShelf1.id,
      purchaseDate: d("2024-06-01"),
      value: new Prisma.Decimal("6.50"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    });
  }
  for (let i = 2; i <= 6; i++) {
    bulkEquipment.push({
      name: "Bow saw",
      assetId: `SAW-${String(i).padStart(3, "0")}`,
      qrValue: `scouts:SAW-${String(i).padStart(3, "0")}`,
      categoryId: toolsCutting.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      locationId: toolArea.id,
      purchaseDate: d("2020-03-18"),
      value: new Prisma.Decimal("18.00"),
      createdById: qm.id,
      updatedById: qm.id,
      isActive: true,
    });
  }

  // Camp kit list style items (from past camps / leaders)
  for (let i = 1; i <= 6; i++) {
    add({
      name: "Two-way radio",
      assetId: `RAD-${String(i).padStart(3, "0")}`,
      categoryId: commsRadios.id,
      quantity: 1,
      locationId: hallCupboardLeft.id,
      notes: "Charge before camp. Use for car park / event comms.",
      purchaseDate: d("2022-09-01"),
      value: new Prisma.Decimal("45.00"),
    });
  }
  add({ name: "Radio charger + spares box", assetId: "RAD-CHG-001", categoryId: commsRadios.id, quantity: 1, locationId: hallCupboardLeft.id, notes: "Charging dock + spare earpieces." });
  add({ name: "Hi-vis vests (adults)", assetId: "HIVIS-ADULT", categoryId: commsEvent.id, quantity: 12, locationId: hallCupboardRight.id, notes: "Car park / roadside use." });
  add({ name: "Hi-vis vests (youth)", assetId: "HIVIS-YOUTH", categoryId: commsEvent.id, quantity: 12, locationId: hallCupboardRight.id });
  add({ name: "Traffic cones", assetId: "CONE-001", categoryId: commsEvent.id, quantity: 8, locationId: hallCupboardRight.id, notes: "Car park / drop-off lanes." });
  add({ name: "Caution tape / barrier tape", assetId: "BARRIER-001", categoryId: commsEvent.id, quantity: 2, locationId: hallCupboardRight.id });

  // Tents named / grouped (leaders often refer to them this way)
  add({ name: "Leader tent (2-person)", assetId: "TENT-LDR-001", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "Leader tent (Alison, Pat)." });
  add({ name: "Leader tent (2-person)", assetId: "TENT-LDR-002", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "Leader tent (Mark)." });
  add({ name: "Leader tent (2-person)", assetId: "TENT-LDR-003", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "Leader tent (Jenn)." });
  add({ name: "Leader tent (4-person)", assetId: "TENT-LDR-004", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id });
  add({ name: "Patrol tent (5-person)", assetId: "TENT-5F", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "5-man tent F." });
  add({ name: "Patrol tent (5-person)", assetId: "TENT-5G", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "5-man tent G." });
  for (const [idx, letter] of ["A", "B", "C", "D", "E"].entries()) {
    add({
      name: `Group tent (8-person)`,
      assetId: `TENT-8${letter}`,
      categoryId: campingTents.id,
      typeId: tentType.id,
      quantity: 1,
      locationId: tentRack.id,
      notes: `8 man tent ${letter} (${idx + 1} of 5).`,
      purchaseDate: d("2016-04-01"),
      value: new Prisma.Decimal("520.00"),
    });
  }
  add({ name: "Teepee tent", assetId: "TENT-TEEPEE", categoryId: campingTents.id, typeId: tentType.id, quantity: 1, locationId: tentRack.id, notes: "Group teepee for activity area / display." });
  add({ name: "Event shelter (3x6m)", assetId: "SHELTER-3X6", categoryId: campingShelter.id, quantity: 1, locationId: attic.id, notes: "Pop-up event shelter. Check pegs + weights." });

  // Repairs / emergency drying / misc camp infrastructure
  add({ name: "Duct tape (tent repairs)", assetId: "TAPE-DUCT", categoryId: consumablesTape.id, quantity: 6, isConsumable: true, minStock: 2, locationId: toolArea.id, notes: "Consumable. Keep at least 2 rolls." });
  add({ name: "Tent repair kit (patches + seam grip)", assetId: "REPAIR-TENT", categoryId: consumablesTape.id, quantity: 1, locationId: toolArea.id });
  add({ name: "Spare sleeping bag", assetId: "SLEEP-SPARE-001", categoryId: campingSleep.id, quantity: 1, locationId: campCupboard.id, condition: EquipmentCondition.GOOD, notes: "Spare for emergencies / cold nights." });
  add({ name: "Spare sleeping bag", assetId: "SLEEP-SPARE-002", categoryId: campingSleep.id, quantity: 1, locationId: campCupboard.id, condition: EquipmentCondition.GOOD });
  add({ name: "Spare blanket", assetId: "BLANKET-001", categoryId: campingSleep.id, quantity: 4, locationId: campCupboard.id, notes: "Extra warmth / emergency." });
  add({ name: "Large towels (wet tent emergency)", assetId: "TOWEL-LARGE", categoryId: water.id, quantity: 6, locationId: campCupboard.id, notes: "Use for drying + absorbing in tents." });

  // Secure storage / first aid / meds
  add({ name: "Locked box (bushcraft sharps)", assetId: "LOCK-SHARPS", categoryId: toolsCutting.id, quantity: 1, locationId: containerA.id, notes: "Keep locked. Store knives / saws / spare blades." });
  add({ name: "Locked box (medicines)", assetId: "LOCK-MEDS", categoryId: firstAid.id, quantity: 1, locationId: firstAidDrawer.id, notes: "Keep locked. Medicines only." });
  add({ name: "First aid kit (event)", assetId: "FAK-002", categoryId: firstAid.id, typeId: firstAidKitType.id, quantity: 1, locationId: firstAidDrawer.id, condition: EquipmentCondition.GOOD, notes: "Smaller kit for meetings / events." });
  add({ name: "Fire blanket (extinguishing)", assetId: "FIRE-BLANKET", categoryId: cookingStoves.id, quantity: 1, locationId: kitchenShelf1.id, notes: "For stove incidents. Check label date." });
  add({ name: "Fire bucket / watering can", assetId: "FIRE-BUCKET", categoryId: water.id, quantity: 2, locationId: hallStore.id, notes: "Campfire safety." });

  // Firewood (tracked as consumables)
  add({ name: "Firewood (kindling)", assetId: "WOOD-KINDLING", categoryId: consumables.id, quantity: 3, locationId: containerA.id, notes: "Bags/boxes. Top up before camps." });
  add({ name: "Firewood logs", assetId: "WOOD-LOGS", categoryId: consumables.id, quantity: 2, locationId: containerA.id, notes: "Crates/sacks." });

  // Pioneering / den building
  add({ name: "Pioneering poles (assorted)", assetId: "POLES-ASSORT", categoryId: pioneering.id, quantity: 12, locationId: containerA.id, notes: "For den building / gateways. Count back in." });
  add({ name: "Paracord spool (50m)", assetId: "PARA-50M", categoryId: pioneering.id, quantity: 2, locationId: ropeBin.id, notes: "Useful for den building. Track remaining." });
  add({ name: "Water pistols", assetId: "WATER-PISTOLS", categoryId: activitiesWideGames.id, quantity: 12, locationId: hallStore.id, notes: "Wide games / den building challenges." });
  add({ name: "Buckets (wide games)", assetId: "BUCKET-001", categoryId: activitiesWideGames.id, quantity: 4, locationId: hallStore.id });

  // Cooking / catering extras
  add({ name: "Slow cooker", assetId: "SLOW-001", categoryId: cooking.id, quantity: 2, locationId: hallStore.id });
  add({ name: "Washing-up bowls", assetId: "WASH-BOWL", categoryId: water.id, quantity: 6, locationId: kitchenShelf2.id });
  add({ name: "Tea towels", assetId: "TEATOWEL", categoryId: water.id, quantity: 12, locationId: kitchenShelf2.id, notes: "Return dry." });
  add({ name: "Kettle", assetId: "KETTLE-001", categoryId: cookingPots.id, quantity: 3, locationId: kitchenShelf2.id });
  add({ name: "Tin opener", assetId: "UTL-TIN", categoryId: cookingUtensils.id, quantity: 3, locationId: kitchenShelf2.id });
  add({ name: "Kebab sticks", assetId: "COOK-KEBAB", categoryId: cookingUtensils.id, quantity: 30, locationId: kitchenShelf2.id, notes: "Mix of bamboo/metal. Check count." });
  add({ name: "Metal marshmallow skewers", assetId: "COOK-MALLOW-M", categoryId: cookingUtensils.id, quantity: 12, locationId: kitchenShelf2.id });
  add({ name: "Marshmallows (camp stock)", assetId: "FOOD-MALLOW", categoryId: consumables.id, quantity: 2, locationId: hallStore.id, notes: "Consumable. Check expiry." });
  add({ name: "Jam biscuits (camp stock)", assetId: "FOOD-BISCUITS", categoryId: consumables.id, quantity: 2, locationId: hallStore.id, notes: "Consumable. Check expiry." });

  // Lighting markers + decorations
  add({ name: "Lantern (leader tent marker)", assetId: "LANT-MARK-001", categoryId: lighting.id, quantity: 4, locationId: campCupboard.id, notes: "Use to mark leader tents / routes." });
  add({ name: "Fairy lights (leaders tents)", assetId: "LIGHT-FAIRY", categoryId: lighting.id, quantity: 4, locationId: campCupboard.id, notes: "Battery/USB depending on set." });

  // Admin / documents / lists
  add({ name: "Leader + section details printout pack", assetId: "DOC-DETAILS", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id, notes: "Print before each camp. Keep in waterproof wallet." });
  add({ name: "Risk assessment pack", assetId: "DOC-RA", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id, notes: "Bring with camp folder." });
  add({ name: "Beaver trail papers", assetId: "DOC-BEAVER-TRAIL", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id });
  add({ name: "Invoice & payments folder (district)", assetId: "DOC-DISTRICT", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id });
  add({ name: "Camp notes / Angela list", assetId: "DOC-ANGELA", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id, notes: "Checklist of extra items to bring." });
  add({ name: "Blanket badges (stock)", assetId: "BADGE-BLANKET", categoryId: adminBadges.id, quantity: 40, locationId: hallCupboardRight.id, notes: "Count before/after camps." });

  // Stationery / crafts
  add({ name: "Bin bags", assetId: "BAGS-BIN", categoryId: consumablesBags.id, quantity: 60, locationId: campCupboard.id, notes: "Consumable. Keep stocked." });
  add({ name: "Pens (assorted)", assetId: "STAT-PENS", categoryId: consumablesStationery.id, quantity: 40, locationId: craftCupboardLeft.id });
  add({ name: "Colouring pens + pencils", assetId: "STAT-COLOURS", categoryId: consumablesStationery.id, quantity: 30, locationId: craftCupboardLeft.id });
  add({ name: "Crayons", assetId: "STAT-CRAYONS", categoryId: consumablesStationery.id, quantity: 8, locationId: craftCupboardRight.id, notes: "Sets of crayons." });
  add({ name: "Ream of paper (A4)", assetId: "STAT-PAPER-A4", categoryId: consumablesStationery.id, quantity: 5, locationId: craftCupboardRight.id, notes: "Consumable." });
  add({ name: "Craft paper (brass rubbings)", assetId: "STAT-BRASSRUB", categoryId: consumablesStationery.id, quantity: 2, locationId: craftCupboardRight.id });

  // Sports / games / wide games
  add({ name: "Bag of balls (mixed)", assetId: "GAME-BALLS", categoryId: activitiesSports.id, quantity: 1, locationId: upstairsShelf2.id });
  add({ name: "Football", assetId: "GAME-FOOTBALL", categoryId: activitiesSports.id, quantity: 2, locationId: upstairsShelf2.id });
  add({ name: "Egg and spoon race kit", assetId: "GAME-EGG-SPOON", categoryId: activitiesWideGames.id, quantity: 1, locationId: upstairsShelf1.id, notes: "Spoons + plastic eggs." });
  add({ name: "Sack race sacks", assetId: "GAME-SACKS", categoryId: activitiesWideGames.id, quantity: 8, locationId: upstairsShelf1.id });
  add({ name: "Reading books (camp box)", assetId: "BOOKS-CAMP", categoryId: activities.id, quantity: 1, locationId: upstairsShelf4.id, notes: "Quiet time / wind-down." });

  // Target sports / activity kits
  add({ name: "Soft archery set", assetId: "ARCH-001", categoryId: activitiesTarget.id, quantity: 1, locationId: upstairsShelf3.id, notes: "Soft archery kit (bows, arrows, target)." });
  add({ name: "Soft archery set", assetId: "ARCH-002", categoryId: activitiesTarget.id, quantity: 1, locationId: upstairsShelf3.id });
  add({ name: "Soft archery set", assetId: "ARCH-003", categoryId: activitiesTarget.id, quantity: 1, locationId: upstairsShelf3.id });
  add({ name: "Soft tomahawks kit", assetId: "TOMA-001", categoryId: activitiesTarget.id, quantity: 1, locationId: upstairsShelf3.id, notes: "3x boards + orange box." });
  add({ name: "Laser pistols + batteries", assetId: "LASER-001", categoryId: activitiesWideGames.id, quantity: 1, locationId: upstairsMetalRight.id, notes: "Check batteries before camp." });

  // General campcraft / meetings kit (lots of common items so the system feels complete)
  add({ name: "Campcraft box", assetId: "CAMPCRAFT-BOX", categoryId: cooking.id, quantity: 1, locationId: patrolBoxRack.id, notes: "General campcraft bits (string, matches, labels, spare clips)." });
  add({ name: "Washing line", assetId: "WASHLINE-001", categoryId: water.id, quantity: 2, locationId: ropeBin.id, notes: "Use with pegs. Dry before storage." });
  add({ name: "Clothes pegs", assetId: "PEGS-CLOTHES", categoryId: water.id, quantity: 60, locationId: ropeBin.id });
  add({ name: "Groundsheet (large)", assetId: "GROUND-001", categoryId: campingShelter.id, quantity: 2, locationId: tentRack.id });
  add({ name: "Groundsheet (small)", assetId: "GROUND-002", categoryId: campingShelter.id, quantity: 4, locationId: tentRack.id });
  add({ name: "Guyline set (spares)", assetId: "GUYLINE-SPARE", categoryId: campingShelter.id, quantity: 1, locationId: ropeBin.id, notes: "Spare guylines/adjusters." });
  add({ name: "Mallet (rubber)", assetId: "MALLET-001", categoryId: toolsGeneral.id, quantity: 4, locationId: toolArea.id });
  add({ name: "Spade", assetId: "SPADE-001", categoryId: toolsGeneral.id, quantity: 2, locationId: toolArea.id });
  add({ name: "Shovel", assetId: "SHOVEL-001", categoryId: toolsGeneral.id, quantity: 1, locationId: toolArea.id });
  add({ name: "Work gloves", assetId: "GLOVES-001", categoryId: toolsGeneral.id, quantity: 12, locationId: toolArea.id, notes: "Spare gloves for activities." });
  add({ name: "Sharpening stone", assetId: "SHARP-001", categoryId: toolsCutting.id, quantity: 2, locationId: toolArea.id });
  add({ name: "Tool roll (spanners/screwdrivers)", assetId: "TOOLS-ROLL", categoryId: toolsGeneral.id, quantity: 1, locationId: toolArea.id });
  add({ name: "Tent pole repair sleeve", assetId: "POLE-REPAIR", categoryId: consumablesTape.id, quantity: 2, locationId: toolArea.id });
  add({ name: "Bin bags", assetId: "BINBAGS", categoryId: consumablesTape.id, quantity: 40, isConsumable: true, minStock: 10, locationId: toolArea.id, notes: "Consumable." });
  add({ name: "Cable ties (assorted)", assetId: "CABLETIES", categoryId: consumablesTape.id, quantity: 200, isConsumable: true, minStock: 50, locationId: toolArea.id, notes: "Consumable." });
  add({ name: "Gaffer tape", assetId: "TAPE-GAFF", categoryId: consumablesTape.id, quantity: 4, isConsumable: true, minStock: 1, locationId: toolArea.id });

  // Power / charging / batteries (beyond the single AA stock)
  add({ name: "Spare batteries (AAA)", assetId: "BAT-AAA", categoryId: consumablesPower.id, quantity: 48, isConsumable: true, minStock: 12, locationId: campCupboard.id, notes: "Consumable. Keep topped up." });
  add({ name: "Power bank (USB)", assetId: "PWRBANK-001", categoryId: consumablesPower.id, quantity: 4, locationId: upstairsMetalLeft.id });
  add({ name: "USB charging cables (mixed)", assetId: "USB-CABLES", categoryId: consumablesPower.id, quantity: 10, locationId: upstairsMetalLeft.id });

  // Programme / paperwork extras
  add({ name: "Waterproof camp folder", assetId: "DOC-FOLDER", categoryId: adminDocs.id, quantity: 1, locationId: hallCupboardMiddle.id, notes: "Holds risk assessment + emergency contacts + programme." });
  add({ name: "Emergency contact cards (blank)", assetId: "DOC-CONTACT-BLANK", categoryId: adminProgramme.id, quantity: 30, locationId: hallCupboardMiddle.id });
  add({ name: "Meeting attendance sheets", assetId: "DOC-ATTEND", categoryId: adminProgramme.id, quantity: 1, locationId: hallCupboardMiddle.id });
  add({ name: "OSM export printout pack", assetId: "DOC-OSM", categoryId: adminProgramme.id, quantity: 1, locationId: hallCupboardMiddle.id, notes: "Members list + medical info (handle securely)." });

  // More games / activities you’d expect on camp
  add({ name: "Rounders set", assetId: "GAME-ROUNDERS", categoryId: activitiesSports.id, quantity: 1, locationId: hallStore.id });
  add({ name: "Frisbees", assetId: "GAME-FRISBEE", categoryId: activitiesSports.id, quantity: 6, locationId: hallStore.id });
  add({ name: "Marker cones", assetId: "GAME-CONES", categoryId: activitiesSports.id, quantity: 24, locationId: hallStore.id, notes: "Field markers for games." });
  add({ name: "Team bibs", assetId: "GAME-BIBS", categoryId: activitiesSports.id, quantity: 20, locationId: hallStore.id });
  add({ name: "Skipping ropes", assetId: "GAME-SKIP", categoryId: activitiesWideGames.id, quantity: 12, locationId: hallStore.id });
  add({ name: "Bean bags", assetId: "GAME-BEANS", categoryId: activitiesWideGames.id, quantity: 20, locationId: hallStore.id });
  add({ name: "Chalk (outdoor)", assetId: "GAME-CHALK", categoryId: consumablesStationery.id, quantity: 10, locationId: hallStore.id });
  add({ name: "Brass rubbing kit", assetId: "ACT-BRASSRUB", categoryId: activities.id, quantity: 1, locationId: hallStore.id, notes: "Crayons + paper + templates." });

  // Additional lanterns/headtorches as common kit stock
  for (let i = 2; i <= 8; i++) {
    add({
      name: "Lantern (LED)",
      assetId: `LANT-${String(i).padStart(3, "0")}`,
      categoryId: lighting.id,
      quantity: 1,
      locationId: campCupboard.id,
      purchaseDate: d("2021-11-15"),
      value: new Prisma.Decimal("18.00"),
    });
  }

  await prisma.equipment.createMany({
    data: bulkEquipment,
    skipDuplicates: true,
  });

  // Type-specific custom field values (for a handful of tents / kits to demonstrate the feature).
  const defs = await prisma.customFieldDefinition.findMany();
  const defByTypeAndKey = new Map<string, string>();
  for (const def of defs) defByTypeAndKey.set(`${def.equipmentTypeId}:${def.key}`, def.id);

  async function setField(assetId: string, typeId: string, key: string, valueJson: Prisma.InputJsonValue) {
    const equipment = await prisma.equipment.findUnique({ where: { assetId }, select: { id: true } });
    if (!equipment) return;
    const defId = defByTypeAndKey.get(`${typeId}:${key}`);
    if (!defId) return;
    await prisma.equipmentCustomFieldValue.upsert({
      where: { equipmentId_fieldDefinitionId: { equipmentId: equipment.id, fieldDefinitionId: defId } },
      create: { equipmentId: equipment.id, fieldDefinitionId: defId, valueJson, updatedById: qm.id },
      update: { valueJson, updatedById: qm.id },
    });
  }

  await Promise.all([
    setField("TENT-001", tentType.id, "sleeps", 4),
    setField("TENT-001", tentType.id, "poles_count", 3),
    setField("TENT-001", tentType.id, "footprint", "Approx 2.2m x 2.6m"),
    setField("TENT-002", tentType.id, "sleeps", 4),
    setField("TENT-002", tentType.id, "poles_count", 3),
    setField("TENT-004", tentType.id, "sleeps", 2),
    setField("TENT-004", tentType.id, "poles_count", 2),
    setField("TENT-8A", tentType.id, "sleeps", 8),
    setField("TENT-8B", tentType.id, "sleeps", 8),
    setField("TENT-8C", tentType.id, "sleeps", 8),
    setField("TENT-8D", tentType.id, "sleeps", 8),
    setField("TENT-8E", tentType.id, "sleeps", 8),
    setField("TENT-TEEPEE", tentType.id, "sleeps", 10),
    setField("TENT-LDR-001", tentType.id, "sleeps", 2),
    setField("TENT-LDR-002", tentType.id, "sleeps", 2),
    setField("TENT-LDR-003", tentType.id, "sleeps", 2),
    setField("TENT-LDR-004", tentType.id, "sleeps", 4),
    setField("TENT-5F", tentType.id, "sleeps", 5),
    setField("TENT-5G", tentType.id, "sleeps", 5),
    setField("FAK-001", firstAidKitType.id, "next_check_due", d("2026-05-01").toISOString()),
    setField("FAK-002", firstAidKitType.id, "next_check_due", d("2026-04-15").toISOString()),
    setField("AXE-001", axeType.id, "sharpening_due", d("2026-06-01").toISOString()),
    setField("AXE-001", axeType.id, "safety_notes", "Use with chopping block. Gloves recommended. Maintain safe circle."),
    setField("STV-001", cookingKitType.id, "fuel_type", "Gas"),
    setField("TRG-001", cookingKitType.id, "fuel_type", "Meths"),
    setField("UTL-001", cookingKitType.id, "cleaning_notes", "Wash and dry; return to labelled bag."),
  ]);

  const tent = await prisma.equipment.upsert({
    where: { assetId: "TENT-001" },
    update: {},
    create: {
      name: "Patrol tent (4-person)",
      assetId: "TENT-001",
      qrValue: "scouts:TENT-001",
      categoryId: camping.id,
      typeId: tentType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      notes: "Stored with poles and pegs. Check pegs count after return.",
      locationId: tentRack.id,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const firstAidKit = await prisma.equipment.upsert({
    where: { assetId: "FAK-001" },
    update: {},
    create: {
      name: "First aid kit (main)",
      assetId: "FAK-001",
      qrValue: "scouts:FAK-001",
      categoryId: firstAid.id,
      typeId: firstAidKitType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.EXCELLENT,
      locationId: campCupboard.id,
      createdById: qm.id,
      updatedById: qm.id,
    },
  });

  const axe = await prisma.equipment.upsert({
    where: { assetId: "AXE-001" },
    update: {},
    create: {
      name: "Axe (splitting)",
      assetId: "AXE-001",
      qrValue: "scouts:AXE-001",
      categoryId: tools.id,
      typeId: axeType.id,
      quantity: 1,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      locationId: containerA.id,
      notes: "Keep in tool box. Use gloves.",
      createdById: qm.id,
      updatedById: qm.id,
    },
  });

  const existingIssue = await prisma.maintenanceIssue.findFirst({
    where: { equipmentId: axe.id, title: "Sharpen axe edge" },
    select: { id: true },
  });
  if (!existingIssue) {
    await prisma.maintenanceIssue.create({
      data: {
        equipmentId: axe.id,
        title: "Sharpen axe edge",
        description: "Blade needs a light sharpen before next camp.",
        priority: MaintenancePriority.MEDIUM,
        createdById: leader.id,
        assignedToId: qm.id,
        logs: {
          create: [{ message: "Noticed during last camp cleanup.", createdById: leader.id }],
        },
      },
    });
  }

  const existingCheckout = await prisma.checkout.findFirst({
    where: { borrowerName: leader.name, notes: "Weekend camp.", status: "OPEN" },
    select: { id: true },
  });
  if (!existingCheckout) {
    const scoutsThu = await prisma.section.findFirst({
      where: { name: "Scouts", meetingDay: DayOfWeek.THURSDAY, isActive: true },
      select: { id: true },
    });

    await prisma.checkout.create({
      data: {
        checkedOutById: leader.id,
        borrowerUserId: leader.id,
        borrowerName: leader.name,
        borrowerSectionId: scoutsThu?.id ?? null,
        expectedReturnAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: "Weekend camp.",
        items: { create: [{ equipmentId: tent.id }, { equipmentId: firstAidKit.id }] },
      },
    });

    await prisma.equipment.update({
      where: { id: tent.id },
      data: { status: EquipmentStatus.CHECKED_OUT },
    });
    await prisma.equipment.update({
      where: { id: firstAidKit.id },
      data: { status: EquipmentStatus.CHECKED_OUT },
    });
  }

  // --- Stock + consumables defaults (idempotent updates) ---
  await prisma.equipment.updateMany({ where: { assetId: "BAT-AA" }, data: { isConsumable: true, minStock: 12 } });
  await prisma.equipment.updateMany({ where: { assetId: "BAT-AAA" }, data: { isConsumable: true, minStock: 12 } });
  await prisma.equipment.updateMany({ where: { assetId: "BINBAGS" }, data: { isConsumable: true, minStock: 10 } });
  await prisma.equipment.updateMany({ where: { assetId: "TAPE-DUCT" }, data: { isConsumable: true, minStock: 2 } });
  await prisma.equipment.updateMany({ where: { assetId: "TAPE-GAFF" }, data: { isConsumable: true, minStock: 1 } });
  await prisma.equipment.updateMany({ where: { assetId: "CABLETIES" }, data: { isConsumable: true, minStock: 50 } });
  await prisma.equipment.updateMany({ where: { assetId: "WOOD-KINDLING" }, data: { isConsumable: true, minStock: 2 } });
  await prisma.equipment.updateMany({ where: { assetId: "FA-EB-001" }, data: { isConsumable: true, minStock: 4 } });

  // --- Bundles / camp kits ---
  async function eqId(assetId: string) {
    const eq = await prisma.equipment.findUnique({ where: { assetId }, select: { id: true } });
    if (!eq) throw new Error(`Missing equipment assetId: ${assetId}`);
    return eq.id;
  }

  async function upsertBundle(name: string, description: string, items: { assetId: string; quantity: number }[]) {
    const bundle = await prisma.checkoutBundle.upsert({
      where: { name },
      update: { description, isActive: true },
      create: { name, description, isActive: true, createdById: qm.id },
      select: { id: true },
    });

    await prisma.checkoutBundleItem.deleteMany({ where: { bundleId: bundle.id } });
    await prisma.checkoutBundleItem.createMany({
      data: await Promise.all(
        items.map(async (i, idx) => ({
          bundleId: bundle.id,
          equipmentId: await eqId(i.assetId),
          quantity: i.quantity,
          sortOrder: idx,
        })),
      ),
    });
  }

  await upsertBundle("Campfire kit", "Essentials for safe campfires.", [
    { assetId: "FIRE-BUCKET", quantity: 1 },
    { assetId: "FIRE-BLANKET", quantity: 1 },
    { assetId: "CAMPCRAFT-BOX", quantity: 1 },
    { assetId: "WOOD-KINDLING", quantity: 1 },
  ]);

  await upsertBundle("First aid pack", "Quick grab-bag for activities and hikes.", [
    { assetId: "FAK-002", quantity: 1 },
    { assetId: "FA-EB-001", quantity: 2 },
  ]);

  await upsertBundle("Soft archery", "Soft archery set plus a few extras.", [
    { assetId: "ARCH-001", quantity: 1 },
    { assetId: "GAME-CONES", quantity: 12 },
  ]);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
